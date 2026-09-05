package show

import (
	"context"
	"database/sql"
	"math"
	"testing"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	_ "modernc.org/sqlite"

	"tgb-resolver/server-go/features/realtime"
	"tgb-resolver/server-go/features/shared/domain"
)

type testEnv struct {
	svc   *Service
	store *Store
	clock *realtime.Clock
	now   *time.Time
}

func newTestEnv(t *testing.T) *testEnv {
	t.Helper()
	sqldb, err := sql.Open("sqlite", testStoreDSN())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { sqldb.Close() })
	now := time.Now()
	clock := realtime.NewClock(func() time.Time { return now })
	store := NewStore(bun.NewDB(sqldb, sqlitedialect.New()))
	hub := realtime.NewHub(clock)
	env := &testEnv{store: store, clock: clock, now: &now}
	env.svc = NewService(store, hub, clock, nilBlobs{})
	ctx := context.Background()
	if err := store.EnsureSeeded(ctx); err != nil {
		t.Fatal(err)
	}
	return env
}

func (e *testEnv) version(t *testing.T) int {
	t.Helper()
	st, err := e.store.GetState(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	return st.ShowVersion
}

func (e *testEnv) setTimeline(t *testing.T, events []domain.TimelineEvent, automation domain.AutomationState) {
	t.Helper()
	ctx := context.Background()
	cur, err := e.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	_, err = e.store.MutateShow(ctx, cur.ShowVersion, func(st domain.ShowState) domain.ShowState {
		st.Timeline = events
		st.Automation = automation
		return st
	})
	if err != nil {
		t.Fatal(err)
	}
}

func cusEvent(id, pos int, offset *float64) domain.TimelineEvent {
	return domain.TimelineEvent{ID: id, Position: pos, Type: domain.TimelineCus, TriggerOffsetSeconds: offset}
}

func TestStartPlayback_RejectsStaleShowVersion(t *testing.T) {
	env := newTestEnv(t)
	if _, err := env.svc.Start(context.Background(), 999); err == nil {
		t.Fatal("want version drift error")
	}
}

func TestPatchTimelineEvent_RejectsNonFinite(t *testing.T) {
	env := newTestEnv(t)
	nan := math.NaN()
	if _, err := env.svc.PatchEvent(context.Background(), 4, PatchEventInput{ShowVersion: env.version(t), DurationSeconds: &nan}); err == nil {
		t.Fatal("want finite error for duration")
	}
	if _, err := env.svc.PatchEvent(context.Background(), 4, PatchEventInput{ShowVersion: env.version(t), TriggerOffsetSeconds: &nan}); err == nil {
		t.Fatal("want finite error for trigger offset")
	}
}

func TestScheduleNextAdvance_HoldsForCurrentDuration(t *testing.T) {
	env := newTestEnv(t)
	dur := 5.0
	env.setTimeline(t, []domain.TimelineEvent{
		{ID: 1, Position: 1, Type: domain.TimelineCus, DurationSeconds: &dur},
		{ID: 2, Position: 2, Type: domain.TimelineCus},
	}, domain.AutomationState{AutoResolveEnabled: true, AutoResolveSpeedMs: 1000})
	ctx := context.Background()
	if _, err := env.svc.Start(ctx, env.version(t)); err != nil {
		t.Fatal(err)
	}
	*env.now = env.now.Add(1 * time.Second)
	env.clock.ProcessDue()
	st, _ := env.store.GetState(ctx)
	if *st.Playback.CurrentEventID != 1 {
		t.Fatalf("want hold at event 1 got %d", *st.Playback.CurrentEventID)
	}
	*env.now = env.now.Add(5 * time.Second)
	env.clock.ProcessDue()
	st, _ = env.store.GetState(ctx)
	if *st.Playback.CurrentEventID != 2 {
		t.Fatalf("want advance to event 2 got %d", *st.Playback.CurrentEventID)
	}
}

func TestScheduleNextAdvance_ZeroAndNegativeOffsetFireImmediately(t *testing.T) {
	for _, offset := range []float64{0, -2} {
		env := newTestEnv(t)
		off := offset
		env.setTimeline(t, []domain.TimelineEvent{
			{ID: 1, Position: 1, Type: domain.TimelineCus},
			{ID: 2, Position: 2, Type: domain.TimelineCus, TriggerOffsetSeconds: &off},
		}, domain.AutomationState{})
		ctx := context.Background()
		if _, err := env.svc.Start(ctx, env.version(t)); err != nil {
			t.Fatal(err)
		}
		env.clock.ProcessDue()
		st, _ := env.store.GetState(ctx)
		if *st.Playback.CurrentEventID != 2 {
			t.Fatalf("offset %v: want event 2 got %d", offset, *st.Playback.CurrentEventID)
		}
	}
}

func TestScheduleNextAdvance_OffsetFiresWithAutoModesOff(t *testing.T) {
	env := newTestEnv(t)
	off := 1.0
	env.setTimeline(t, []domain.TimelineEvent{
		{ID: 1, Position: 1, Type: domain.TimelineCus},
		{ID: 2, Position: 2, Type: domain.TimelineCus, TriggerOffsetSeconds: &off},
	}, domain.AutomationState{})
	ctx := context.Background()
	if _, err := env.svc.Start(ctx, env.version(t)); err != nil {
		t.Fatal(err)
	}
	*env.now = env.now.Add(1100 * time.Millisecond)
	env.clock.ProcessDue()
	st, _ := env.store.GetState(ctx)
	if *st.Playback.CurrentEventID != 2 {
		t.Fatalf("want event 2 got %d", *st.Playback.CurrentEventID)
	}
}

func TestStartPlayback_ActiveIDsIncludeConcurrentChildren(t *testing.T) {
	env := newTestEnv(t)
	zero := 0.0
	env.setTimeline(t, []domain.TimelineEvent{
		{ID: 1, Position: 1, Type: domain.TimelineCus},
		{ID: 2, Position: 2, Type: domain.TimelineCus, TriggerOffsetSeconds: &zero},
	}, domain.AutomationState{})
	ctx := context.Background()
	updated, err := env.svc.Start(ctx, env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	if len(updated.Playback.ActiveEventIDs) != 2 {
		t.Fatalf("want concurrent group active got %v", updated.Playback.ActiveEventIDs)
	}
}

func TestSetLiveMode_ResetsPlaybackToIdle(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	if _, err := env.svc.Start(ctx, env.version(t)); err != nil {
		t.Fatal(err)
	}
	updated, err := env.svc.SetLive(ctx, true)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Mode != domain.ShowModeLive {
		t.Fatalf("want live got %v", updated.Mode)
	}
	if updated.Playback.Status != domain.PlaybackIdle || updated.Playback.CurrentEventID != nil {
		t.Fatalf("want idle playback got %+v", updated.Playback)
	}
}

func TestSeekPlayback_PausedResumesIdleStays(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	env.setTimeline(t, []domain.TimelineEvent{
		{ID: 1, Position: 1, Type: domain.TimelineCus},
		{ID: 2, Position: 2, Type: domain.TimelineCus},
	}, domain.AutomationState{})
	if _, err := env.svc.Start(ctx, env.version(t)); err != nil {
		t.Fatal(err)
	}
	paused, err := env.svc.Start(ctx, env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	if paused.Playback.Status != domain.PlaybackPaused {
		t.Fatalf("want paused got %v", paused.Playback.Status)
	}
	resumed, err := env.svc.Seek(ctx, env.version(t), 2)
	if err != nil {
		t.Fatal(err)
	}
	if resumed.Playback.Status != domain.PlaybackRunning || *resumed.Playback.CurrentEventID != 2 {
		t.Fatalf("want running at 2 got %+v", resumed.Playback)
	}

	env2 := newTestEnv(t)
	env2.setTimeline(t, []domain.TimelineEvent{
		{ID: 1, Position: 1, Type: domain.TimelineCus},
		{ID: 2, Position: 2, Type: domain.TimelineCus},
	}, domain.AutomationState{})
	idle, err := env2.svc.Seek(context.Background(), env2.version(t), 2)
	if err != nil {
		t.Fatal(err)
	}
	if idle.Playback.Status != domain.PlaybackIdle {
		t.Fatalf("want idle to stay idle got %v", idle.Playback.Status)
	}
}

func TestSeekPlayback_MissingEventErrors(t *testing.T) {
	env := newTestEnv(t)
	if _, err := env.svc.Seek(context.Background(), env.version(t), 4242); err == nil {
		t.Fatal("want missing event error")
	}
}

func TestSetTickRate_NilDefaultsToSixty(t *testing.T) {
	env := newTestEnv(t)
	if err := env.svc.SetTickRate(nil); err != nil {
		t.Fatal(err)
	}
	if env.clock.TickRate() != 60 {
		t.Fatalf("want 60 got %v", env.clock.TickRate())
	}
}

func TestOrchestrator_MultipleAdvancesAndCancel(t *testing.T) {
	clock := realtime.NewClock(nil)
	fired := 0
	orch := realtime.NewOrchestrator(clock, func() { fired++ })
	orch.ScheduleAdvance(0)
	orch.ScheduleAdvance(0)
	clock.ProcessDue()
	if fired != 2 {
		t.Fatalf("want 2 fires got %d", fired)
	}
	orch.ScheduleAdvance(time.Hour)
	orch.CancelAdvance()
	clock.ProcessDue()
	if fired != 2 {
		t.Fatalf("want cancel to suppress, got %d fires", fired)
	}
}

func TestNormalizeShowState_FillsLegacyNullMaps(t *testing.T) {
	state := domain.ShowState{}
	normalized := normalizeShowState(state)
	if normalized.Contest.Problems == nil || normalized.Contest.Users == nil ||
		normalized.Contest.PreFreezeSnapshot == nil || normalized.Timeline == nil ||
		normalized.Assets.Items == nil || normalized.Assets.Folders == nil ||
		normalized.Playback.ActiveEventIDs == nil {
		t.Fatal("want all collections initialized")
	}
}
