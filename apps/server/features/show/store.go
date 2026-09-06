package show

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	_ "modernc.org/sqlite"

	"tgb-resolver/server/features/shared/domain"
)

const localShowID = "local-show"

const currentSchemaVersion = 1

type StoredShowState struct {
	bun.BaseModel   `bun:"table:show_states"`
	ID              string `bun:"id,pk"`
	ShowVersion     int    `bun:"show_version"`
	PayloadJSON     string `bun:"payload_json"`
	UpdatedAtUnixMs int64  `bun:"updated_at_unix_ms"`
}

type Store struct {
	db       *bun.DB
	now      func() time.Time
	initOnce sync.Once
	initErr  error
}

func Open(path string) (*bun.DB, error) {
	log.Debug().Str("path", path).Msg("Store Open start")
	if dir := filepath.Dir(path); dir != "" {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			log.Error().Err(err).Str("path", path).Msg("Store Open mkdir failed")
			return nil, err
		}
	}
	sqldb, err := sql.Open("sqlite", path)
	if err != nil {
		log.Error().Err(err).Str("path", path).Msg("Store Open sql open failed")
		return nil, err
	}
	log.Info().Str("path", path).Msg("Store Open succeeded")
	return bun.NewDB(sqldb, sqlitedialect.New()), nil
}

func NewStore(db *bun.DB) *Store {
	return &Store{db: db, now: time.Now}
}

func (s *Store) Migrate(ctx context.Context) error {
	log.Debug().Msg("Store Migrate start")
	_, err := s.db.NewCreateTable().Model((*StoredShowState)(nil)).IfNotExists().Exec(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Store Migrate failed")
		return err
	}
	log.Info().Msg("Store Migrate succeeded")
	return nil
}

func (s *Store) EnsureSeeded(ctx context.Context) error {
	log.Debug().Msg("Store EnsureSeeded start")
	if err := s.Migrate(ctx); err != nil {
		log.Error().Err(err).Msg("Store EnsureSeeded migrate failed")
		return err
	}
	exists, err := s.db.NewSelect().Model((*StoredShowState)(nil)).Where("id = ?", localShowID).Exists(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Store EnsureSeeded exists check failed")
		return err
	}
	if exists {
		log.Debug().Msg("Store EnsureSeeded already seeded")
		return nil
	}
	seeded := CreateSeededShow()
	payload, err := json.Marshal(seeded)
	if err != nil {
		log.Error().Err(err).Msg("Store EnsureSeeded marshal failed")
		return err
	}
	_, err = s.db.NewInsert().Model(&StoredShowState{
		ID: localShowID, ShowVersion: seeded.ShowVersion,
		PayloadJSON: string(payload), UpdatedAtUnixMs: s.now().UnixMilli(),
	}).Exec(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Store EnsureSeeded insert failed")
		return err
	}
	log.Info().Int("showVersion", seeded.ShowVersion).Msg("Store EnsureSeeded seeded")
	return nil
}

func (s *Store) ensureInit(ctx context.Context) error {
	s.initOnce.Do(func() {
		s.initErr = s.EnsureSeeded(ctx)
	})
	return s.initErr
}

func (s *Store) GetState(ctx context.Context) (domain.ShowState, error) {
	log.Debug().Msg("Store GetState start")
	if err := s.ensureInit(ctx); err != nil {
		log.Error().Err(err).Msg("Store GetState ensure seeded failed")
		return domain.ShowState{}, err
	}
	var entity StoredShowState
	if err := s.db.NewSelect().Model(&entity).Where("id = ?", localShowID).Scan(ctx); err != nil {
		log.Error().Err(err).Msg("Store GetState scan failed")
		return domain.ShowState{}, err
	}
	var state domain.ShowState
	if err := json.Unmarshal([]byte(entity.PayloadJSON), &state); err != nil {
		log.Error().Err(err).Msg("Store GetState unmarshal corrupt payload")
		return domain.ShowState{}, fmt.Errorf("stored show payload corrupt: %w", err)
	}
	log.Debug().Int("showVersion", state.ShowVersion).Msg("Store GetState succeeded")
	return normalizeShowState(state), nil
}

func (s *Store) MutateShow(ctx context.Context, expectedShowVersion int, fn func(domain.ShowState) domain.ShowState) (domain.ShowState, error) {
	return s.transact(ctx, func(entity *StoredShowState, current domain.ShowState) (domain.ShowState, error) {
		if current.ShowVersion != expectedShowVersion {
			return domain.ShowState{}, fmt.Errorf("%w: want %d got %d", domain.ErrVersionDrift, expectedShowVersion, current.ShowVersion)
		}
		updated := fn(current)
		updated.ShowVersion = current.ShowVersion + 1
		return updated, nil
	})
}

func (s *Store) MutateShowUnchecked(ctx context.Context, fn func(domain.ShowState) domain.ShowState) (domain.ShowState, error) {
	return s.transact(ctx, func(entity *StoredShowState, current domain.ShowState) (domain.ShowState, error) {
		updated := fn(current)
		updated.ShowVersion = current.ShowVersion + 1
		return updated, nil
	})
}

func (s *Store) MutateShowChecked(ctx context.Context, expectedShowVersion int, fn func(domain.ShowState) (domain.ShowState, error)) (domain.ShowState, error) {
	return s.transact(ctx, func(entity *StoredShowState, current domain.ShowState) (domain.ShowState, error) {
		if current.ShowVersion != expectedShowVersion {
			return domain.ShowState{}, fmt.Errorf("%w: want %d got %d", domain.ErrVersionDrift, expectedShowVersion, current.ShowVersion)
		}
		updated, err := fn(current)
		if err != nil {
			return domain.ShowState{}, err
		}
		updated.ShowVersion = current.ShowVersion + 1
		return updated, nil
	})
}

func (s *Store) MutatePlaybackChecked(ctx context.Context, expectedShowVersion int, fn func(domain.ShowState) (domain.ShowState, error)) (domain.ShowState, error) {
	return s.transact(ctx, func(entity *StoredShowState, current domain.ShowState) (domain.ShowState, error) {
		if current.ShowVersion != expectedShowVersion {
			return domain.ShowState{}, fmt.Errorf("%w: want %d got %d", domain.ErrVersionDrift, expectedShowVersion, current.ShowVersion)
		}
		updated, err := fn(current)
		if err != nil {
			return domain.ShowState{}, err
		}
		updated.ShowVersion = current.ShowVersion
		return updated, nil
	})
}

func (s *Store) MutatePlayback(ctx context.Context, fn func(domain.ShowState) domain.ShowState) (domain.ShowState, error) {
	return s.transact(ctx, func(entity *StoredShowState, current domain.ShowState) (domain.ShowState, error) {
		updated := fn(current)
		updated.ShowVersion = current.ShowVersion
		return updated, nil
	})
}

func (s *Store) Replace(ctx context.Context, next domain.ShowState) (domain.ShowState, error) {
	return s.transact(ctx, func(entity *StoredShowState, current domain.ShowState) (domain.ShowState, error) {
		return next, nil
	})
}

func (s *Store) transact(ctx context.Context, fn func(*StoredShowState, domain.ShowState) (domain.ShowState, error)) (domain.ShowState, error) {
	log.Debug().Msg("Store transact start")
	if err := s.ensureInit(ctx); err != nil {
		log.Error().Err(err).Msg("Store transact ensure seeded failed")
		return domain.ShowState{}, err
	}
	var out domain.ShowState
	err := s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var entity StoredShowState
		if err := tx.NewSelect().Model(&entity).Where("id = ?", localShowID).Scan(ctx); err != nil {
			log.Error().Err(err).Msg("Store transact select failed")
			return err
		}
		var current domain.ShowState
		if err := json.Unmarshal([]byte(entity.PayloadJSON), &current); err != nil {
			log.Error().Err(err).Msg("Store transact unmarshal corrupt payload")
			return fmt.Errorf("stored show payload corrupt: %w", err)
		}
		updated, err := fn(&entity, current)
		if err != nil {
			if errors.Is(err, domain.ErrVersionDrift) {
				log.Warn().Err(err).Int("expected", current.ShowVersion).Msg("Store transact version drift")
			} else {
				log.Warn().Err(err).Msg("Store transact business error")
			}
			return err
		}
		payload, err := json.Marshal(updated)
		if err != nil {
			log.Error().Err(err).Msg("Store transact marshal failed")
			return err
		}
		entity.ShowVersion = updated.ShowVersion
		entity.PayloadJSON = string(payload)
		entity.UpdatedAtUnixMs = s.now().UnixMilli()
		_, err = tx.NewUpdate().Model(&entity).Where("id = ?", localShowID).Exec(ctx)
		if err != nil {
			log.Error().Err(err).Msg("Store transact update failed")
			return err
		}
		out = updated
		return nil
	})
	if err != nil {
		log.Warn().Err(err).Msg("Store transact failed")
		return domain.ShowState{}, err
	}
	log.Debug().Int("showVersion", out.ShowVersion).Msg("Store transact succeeded")
	return out, err
}

func strPtr(s string) *string { return &s }

func normalizeShowState(state domain.ShowState) domain.ShowState {
	if state.Contest.Problems == nil {
		state.Contest.Problems = []domain.ProblemDefinition{}
	}
	if state.Contest.Users == nil {
		state.Contest.Users = []domain.UserDefinition{}
	}
	if state.Contest.PreFreezeSnapshot == nil {
		state.Contest.PreFreezeSnapshot = []domain.FreezeSnapshotEntry{}
	}
	if state.Timeline == nil {
		state.Timeline = []domain.TimelineEvent{}
	}
	if state.Assets.Items == nil {
		state.Assets.Items = []domain.ShowAsset{}
	}
	if state.Assets.Folders == nil {
		state.Assets.Folders = []domain.FolderNode{}
	}
	if state.Playback.ActiveEventIDs == nil {
		state.Playback.ActiveEventIDs = []int{}
	}
	return state
}

func intPtr(i int) *int { return &i }

func floatPtr(f float64) *float64 { return &f }

func CreateEmptyShow(showVersion int, source domain.ShowSource) domain.ShowState {
	return domain.ShowState{
		SchemaVersion: currentSchemaVersion, ShowVersion: showVersion,
		Mode: domain.ShowModeEditing, TimelineMode: domain.TimelineRw,
		Meta: domain.ShowMeta{Title: "Untitled show", Source: source},
		Contest: domain.ContestState{
			Problems:          []domain.ProblemDefinition{},
			Users:             []domain.UserDefinition{},
			PreFreezeSnapshot: []domain.FreezeSnapshotEntry{},
		},
		Automation: domain.AutomationState{AutoResolveSpeedMs: 3000},
		Playback:   domain.PlaybackState{Status: domain.PlaybackIdle, ActiveEventIDs: []int{}},
		Assets:     domain.AssetCollection{Items: []domain.ShowAsset{}, Folders: []domain.FolderNode{}},
		Timeline:   []domain.TimelineEvent{},
	}
}

func CreateSeededShow() domain.ShowState {
	state := CreateEmptyShow(1, domain.ShowSourceManual)
	state.Meta = domain.ShowMeta{Title: "Local Show", ContestID: strPtr("local-show"), Source: domain.ShowSourceManual}
	state.Contest = domain.ContestState{
		DurationSeconds: 18000, FreezeDurationSeconds: 3600,
		Problems: []domain.ProblemDefinition{
			{ID: 1, Label: "A", Name: "Problem A", Score: 100},
			{ID: 2, Label: "B", Name: "Problem B", Score: 125},
		},
		Users: []domain.UserDefinition{
			{ID: 1, Username: "alice", RealName: "Alice Team"},
			{ID: 2, Username: "bob", RealName: "Bob Team"},
		},
		PreFreezeSnapshot: []domain.FreezeSnapshotEntry{
			{UserID: 1, TotalScore: 100, Rank: 1,
				Problems: []domain.ProblemFreezeResult{
					{ProblemID: 1, Score: 100, Verdict: domain.VerdictAccepted},
					{ProblemID: 2, Verdict: domain.VerdictUnknown},
				},
				LastRunID: intPtr(3831), LastSubmittedSeconds: floatPtr(1390.506239)},
			{UserID: 2, TotalScore: 80, Rank: 2,
				Problems: []domain.ProblemFreezeResult{
					{ProblemID: 1, Score: 80, Verdict: domain.VerdictAccepted},
					{ProblemID: 2, Verdict: domain.VerdictUnknown},
				},
				LastRunID: intPtr(3940), LastSubmittedSeconds: floatPtr(2985.246934)},
		},
	}
	state.Timeline = []domain.TimelineEvent{
		{ID: 1, Position: 1, Type: domain.TimelineRes,
			Resolve: &domain.ResolveEventPayload{UserID: 1, ProblemID: 1, NewTotalScore: 100, NewRank: 1, Verdict: domain.VerdictAccepted, TimeSinceStart: 1094.180335}},
		{ID: 2, Position: 2, Type: domain.TimelinePre, TriggerOffsetSeconds: floatPtr(0.5),
			Pre: &domain.ResolveEventPayload{UserID: 2, ProblemID: 2, NewTotalScore: 180, NewRank: 2, Verdict: domain.VerdictAccepted, TimeSinceStart: 1932.430581}},
		{ID: 3, Position: 3, Type: domain.TimelineRes, CustomName: strPtr("Bob Reveal"),
			Resolve: &domain.ResolveEventPayload{UserID: 2, ProblemID: 2, NewTotalScore: 180, NewRank: 2, Verdict: domain.VerdictAccepted, TimeSinceStart: 1932.430581}},
		{ID: 4, Position: 4, Type: domain.TimelineCus, TriggerOffsetSeconds: floatPtr(1), CustomName: strPtr("Countdown"),
			Custom: &domain.CustomEventPayload{ExtID: "timer", ExtPayload: map[string]any{"minutes": 5}}},
	}
	return state
}
