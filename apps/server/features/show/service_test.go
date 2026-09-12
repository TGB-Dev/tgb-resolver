package show

import (
	"context"
	"database/sql"
	"math"
	"os"
	"testing"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	_ "modernc.org/sqlite"

	"tgb-resolver/server/features/assets"
	"tgb-resolver/server/features/realtime"
	"tgb-resolver/server/features/shared/domain"
	"tgb-resolver/server/features/shared/logging"
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
	hub := realtime.NewHub(clock, nil, logging.Discard())
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

func TestPatchTimelineEvent_WhileRunning_RearmsTriggerOffset(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	env.setTimeline(t, []domain.TimelineEvent{
		{ID: 1, Position: 1, Type: domain.TimelineCus},
		{ID: 2, Position: 2, Type: domain.TimelineCus},
		{ID: 3, Position: 3, Type: domain.TimelineCus},
	}, domain.AutomationState{})
	if _, err := env.svc.Start(ctx, env.version(t)); err != nil {
		t.Fatal(err)
	}
	off := 1.0
	if _, err := env.svc.PatchEvent(ctx, 2, PatchEventInput{ShowVersion: env.version(t), TriggerOffsetSeconds: &off}); err != nil {
		t.Fatal(err)
	}
	*env.now = env.now.Add(1100 * time.Millisecond)
	env.clock.ProcessDue()
	st, _ := env.store.GetState(ctx)
	if *st.Playback.CurrentEventID != 2 {
		t.Fatalf("want advance to event 2 got %d", *st.Playback.CurrentEventID)
	}
}

func TestPatchTimelineEvent_WhileRunning_ClearOffsetCancelsPendingAdvance(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	off := 1.0
	env.setTimeline(t, []domain.TimelineEvent{
		{ID: 1, Position: 1, Type: domain.TimelineCus},
		{ID: 2, Position: 2, Type: domain.TimelineCus, TriggerOffsetSeconds: &off},
		{ID: 3, Position: 3, Type: domain.TimelineCus},
	}, domain.AutomationState{})
	if _, err := env.svc.Start(ctx, env.version(t)); err != nil {
		t.Fatal(err)
	}
	if _, err := env.svc.PatchEvent(ctx, 2, PatchEventInput{ShowVersion: env.version(t), ClearTriggerOffset: true}); err != nil {
		t.Fatal(err)
	}
	*env.now = env.now.Add(1100 * time.Millisecond)
	env.clock.ProcessDue()
	st, _ := env.store.GetState(ctx)
	if *st.Playback.CurrentEventID != 1 {
		t.Fatalf("want hold at event 1 got %d", *st.Playback.CurrentEventID)
	}
}

func TestTickRate_DefaultsToNull_AndMapsToSnapshot(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	before, err := env.svc.Snapshot(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if before.TickRate != nil {
		t.Fatalf("want nil tick rate got %v", *before.TickRate)
	}
	cur, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	rate := 120.0
	cur.TickRate = &rate
	if _, err := env.store.Replace(ctx, cur); err != nil {
		t.Fatal(err)
	}
	updated, err := env.svc.Snapshot(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if updated.TickRate == nil || *updated.TickRate != 120 {
		t.Fatalf("want 120 got %+v", updated.TickRate)
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

func TestRescheduleAdvance_DoesNothingWhenPlaybackIsNotRunning(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	before, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err := env.svc.RescheduleAdvance(ctx); err != nil {
		t.Fatal(err)
	}
	after, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if after.ShowVersion != before.ShowVersion {
		t.Fatalf("want version %d got %d", before.ShowVersion, after.ShowVersion)
	}
	if after.Playback.Status != before.Playback.Status {
		t.Fatalf("want status %v got %v", before.Playback.Status, after.Playback.Status)
	}
}

func TestStartPlayback_BroadcastsPlaybackStateChangedWithoutBumpingShowVersion(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	before, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	updated, err := env.svc.Start(ctx, before.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	if updated.ShowVersion != before.ShowVersion {
		t.Fatalf("want version unchanged %d got %d", before.ShowVersion, updated.ShowVersion)
	}
	if updated.Playback.Status != domain.PlaybackRunning {
		t.Fatalf("want running got %v", updated.Playback.Status)
	}
}

func TestNonPlaybackShowMutations_IncrementShowVersion(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	v := env.version(t)
	byMode, err := env.svc.SetTimelineMode(ctx, v, domain.TimelineRo)
	if err != nil {
		t.Fatal(err)
	}
	if byMode.ShowVersion != v+1 {
		t.Fatalf("want %d got %d", v+1, byMode.ShowVersion)
	}
	fullAuto := true
	byAutomation, err := env.svc.SetAutomation(ctx, AutomationPatch{ShowVersion: byMode.ShowVersion, FullAutoEnabled: &fullAuto})
	if err != nil {
		t.Fatal(err)
	}
	if byAutomation.ShowVersion != byMode.ShowVersion+1 {
		t.Fatalf("want %d got %d", byMode.ShowVersion+1, byAutomation.ShowVersion)
	}
	byLive, err := env.svc.SetLive(ctx, true)
	if err != nil {
		t.Fatal(err)
	}
	if byLive.ShowVersion != byAutomation.ShowVersion+1 {
		t.Fatalf("want %d got %d", byAutomation.ShowVersion+1, byLive.ShowVersion)
	}
}

func TestAdvancePlaybackAsync_WhenRunning_MovesToTheNextEvent(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	started, err := env.svc.Start(ctx, env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	if *started.Playback.CurrentEventID != 1 {
		t.Fatalf("want current 1 got %d", *started.Playback.CurrentEventID)
	}
	after, err := env.svc.Advance(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if *after.Playback.CurrentEventID != 2 {
		t.Fatalf("want current 2 got %d", *after.Playback.CurrentEventID)
	}
	if len(after.Playback.ActiveEventIDs) != 2 || after.Playback.ActiveEventIDs[0] != 1 || after.Playback.ActiveEventIDs[1] != 2 {
		t.Fatalf("want active [1 2] got %v", after.Playback.ActiveEventIDs)
	}
}

func TestAdvancePlaybackAsync_WhenIdle_DoesNothing(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	before, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err := func() error {
		_, err := env.svc.Advance(ctx)
		return err
	}(); err != nil {
		t.Fatal(err)
	}
	after, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if after.ShowVersion != before.ShowVersion {
		t.Fatalf("want version %d got %d", before.ShowVersion, after.ShowVersion)
	}
	if after.Playback.Status != domain.PlaybackIdle {
		t.Fatalf("want idle got %v", after.Playback.Status)
	}
}

func TestSeekPlayback_MovesTheCurrentEventToTheRequestedTimelineEvent(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	updated, err := env.svc.Seek(ctx, env.version(t), 3)
	if err != nil {
		t.Fatal(err)
	}
	if *updated.Playback.CurrentEventID != 3 {
		t.Fatalf("want current 3 got %d", *updated.Playback.CurrentEventID)
	}
	if len(updated.Playback.ActiveEventIDs) != 1 || updated.Playback.ActiveEventIDs[0] != 3 {
		t.Fatalf("want active [3] got %v", updated.Playback.ActiveEventIDs)
	}
}

func TestCreateNonResolveEvent_InsertsCustomEventAtPosition(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	dur := 7.0
	off := 1.5
	manual := false
	name := "Inserted"
	updated, err := env.svc.CreateEvent(ctx, CreateEventInput{
		ShowVersion: env.version(t), RelativeToEventID: 2, Before: true,
		DurationSeconds: &dur, TriggerOffsetSeconds: &off,
		RequireManualInteraction: &manual, CustomName: &name,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(updated.Timeline) != 5 {
		t.Fatalf("want 5 events got %d", len(updated.Timeline))
	}
	inserted := updated.Timeline[1]
	if inserted.CustomName == nil || *inserted.CustomName != "Inserted" {
		t.Fatalf("want Inserted got %+v", inserted.CustomName)
	}
	if inserted.Position != 2 {
		t.Fatalf("want position 2 got %d", inserted.Position)
	}
	if updated.Timeline[2].ID != 2 {
		t.Fatalf("want id 2 at index 2 got %d", updated.Timeline[2].ID)
	}
}

func TestPatchTimelineEvent_UpdatesCustomEventFields(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	dur := 7.0
	off := 1.5
	name := "Renamed"
	manual := true
	updated, err := env.svc.PatchEvent(ctx, 4, PatchEventInput{
		ShowVersion: env.version(t), DurationSeconds: &dur, CustomName: &name,
		TriggerOffsetSeconds: &off, RequireManualInteraction: &manual,
	})
	if err != nil {
		t.Fatal(err)
	}
	var found *domain.TimelineEvent
	for i, e := range updated.Timeline {
		if e.ID == 4 {
			found = &updated.Timeline[i]
		}
	}
	if found == nil {
		t.Fatal("want event 4 present")
	}
	if found.DurationSeconds == nil || *found.DurationSeconds != 7 {
		t.Fatalf("want duration 7 got %v", found.DurationSeconds)
	}
	if found.CustomName == nil || *found.CustomName != "Renamed" {
		t.Fatalf("want Renamed got %+v", found.CustomName)
	}
	if found.TriggerOffsetSeconds == nil || *found.TriggerOffsetSeconds != 1.5 {
		t.Fatalf("want offset 1.5 got %v", found.TriggerOffsetSeconds)
	}
	if found.RequireManualInteraction == nil || !*found.RequireManualInteraction {
		t.Fatalf("want manual true got %v", found.RequireManualInteraction)
	}
}

func TestMoveNonResolveEvent_ReordersCustomEvent(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	updated, err := env.svc.MoveEvent(ctx, 4, MoveEventInput{ShowVersion: env.version(t), RelativeToEventID: 2, Before: true})
	if err != nil {
		t.Fatal(err)
	}
	want := []int{1, 4, 2, 3}
	if len(updated.Timeline) != len(want) {
		t.Fatalf("want %v got %v", want, updated.Timeline)
	}
	for i, id := range want {
		if updated.Timeline[i].ID != id {
			t.Fatalf("want order %v got ids %v", want, idsOf(updated.Timeline))
		}
	}
}

func TestMoveNonResolveEvent_RejectsResolveEvent(t *testing.T) {
	env := newTestEnv(t)
	if _, err := env.svc.MoveEvent(context.Background(), 1, MoveEventInput{ShowVersion: env.version(t), RelativeToEventID: 2, Before: true}); err == nil {
		t.Fatal("want reorder guard error")
	}
}

func TestDeleteNonResolveEvent_RemovesEventAndRenumbers(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	updated, err := env.svc.DeleteEvent(ctx, env.version(t), 4)
	if err != nil {
		t.Fatal(err)
	}
	if len(updated.Timeline) != 3 {
		t.Fatalf("want 3 events got %d", len(updated.Timeline))
	}
	for i, e := range updated.Timeline {
		if e.Position != i+1 {
			t.Fatalf("want positions 1..3 got %v", idsOf(updated.Timeline))
		}
	}
}

func TestDeleteNonResolveEvent_RejectsResolveEvent(t *testing.T) {
	env := newTestEnv(t)
	if _, err := env.svc.DeleteEvent(context.Background(), env.version(t), 1); err == nil {
		t.Fatal("want delete guard error")
	}
}

func TestOptimize_KeepsResolveAndPayloadEvents_ReindexesPositions(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	dur := 5.0
	off := 0.5
	manual := false
	name := "Payloadless"
	created, err := env.svc.CreateEvent(ctx, CreateEventInput{
		ShowVersion: env.version(t), RelativeToEventID: 2, Before: false,
		DurationSeconds: &dur, TriggerOffsetSeconds: &off,
		RequireManualInteraction: &manual, CustomName: &name,
	})
	if err != nil {
		t.Fatal(err)
	}
	updated, err := env.svc.Optimize(ctx, created.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	if len(updated.Timeline) != 4 {
		t.Fatalf("want 4 events got %d", len(updated.Timeline))
	}
	for i, e := range updated.Timeline {
		if e.Position != i+1 {
			t.Fatalf("want positions 1..4 got %v", updated.Timeline)
		}
		if e.CustomName != nil && *e.CustomName == "Payloadless" {
			t.Fatal("want payloadless event dropped")
		}
	}
}

func TestClear_ResetsShowToEmptyManualState(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	before := env.version(t)
	updated, err := env.svc.Clear(ctx, before)
	if err != nil {
		t.Fatal(err)
	}
	if len(updated.Timeline) != 0 {
		t.Fatalf("want empty timeline got %d", len(updated.Timeline))
	}
	if updated.Meta.Title != "Untitled show" {
		t.Fatalf("want Untitled show got %q", updated.Meta.Title)
	}
	if updated.Meta.Source != domain.ShowSourceManual {
		t.Fatalf("want manual source got %v", updated.Meta.Source)
	}
	if updated.ShowVersion != before+1 {
		t.Fatalf("want %d got %d", before+1, updated.ShowVersion)
	}
}

func TestImportXml_ReplacesShowWithParsedContest(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	before := env.version(t)
	raw, err := os.ReadFile("../importing/testdata/sample.xml")
	if err != nil {
		t.Fatal(err)
	}
	updated, err := env.svc.ImportXML(ctx, string(raw), nil)
	if err != nil {
		t.Fatal(err)
	}
	if updated.ShowVersion != before+1 {
		t.Fatalf("want %d got %d", before+1, updated.ShowVersion)
	}
	if updated.Meta.Source != domain.ShowSourceXml {
		t.Fatalf("want xml source got %v", updated.Meta.Source)
	}
	if len(updated.Contest.Users) == 0 {
		t.Fatal("want parsed users")
	}
	if len(updated.Timeline) == 0 {
		t.Fatal("want parsed timeline events")
	}
}

func TestImportXml_RejectsReadOnlyTimeline(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	byMode, err := env.svc.SetTimelineMode(ctx, env.version(t), domain.TimelineRo)
	if err != nil {
		t.Fatal(err)
	}
	_ = byMode
	raw, err := os.ReadFile("../importing/testdata/sample.xml")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := env.svc.ImportXML(ctx, string(raw), nil); err == nil {
		t.Fatal("want read-only error")
	}
}

func TestCreateFolder_AddsRootFolder(t *testing.T) {
	env := newTestEnv(t)
	updated, err := env.svc.CreateFolder(context.Background(), "My Folder", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	if len(updated.Assets.Folders) != 1 {
		t.Fatalf("want 1 folder got %d", len(updated.Assets.Folders))
	}
	if updated.Assets.Folders[0].Name != "My Folder" {
		t.Fatalf("want My Folder got %q", updated.Assets.Folders[0].Name)
	}
}

func TestCreateFolder_AddsNestedFolder(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	root, err := env.svc.CreateFolder(ctx, "Root", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	updated, err := env.svc.CreateFolder(ctx, "Child", root.Assets.Folders[0].ID, root.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	if len(updated.Assets.Folders) != 1 {
		t.Fatalf("want 1 root got %d", len(updated.Assets.Folders))
	}
	children := updated.Assets.Folders[0].Children
	if len(children) != 1 || children[0].Name != "Child" {
		t.Fatalf("want [Child] got %+v", children)
	}
}

func TestRenameFolder_UpdatesName(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	created, err := env.svc.CreateFolder(ctx, "Old Name", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	updated, err := env.svc.RenameEntry(ctx, created.Assets.Folders[0].ID, true, "New Name", created.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Assets.Folders[0].Name != "New Name" {
		t.Fatalf("want New Name got %q", updated.Assets.Folders[0].Name)
	}
}

func TestRenameFolder_UpdatesNestedSubfolderName(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	root, err := env.svc.CreateFolder(ctx, "Root", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	child, err := env.svc.CreateFolder(ctx, "Old Subfolder", root.Assets.Folders[0].ID, root.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	subID := child.Assets.Folders[0].Children[0].ID
	updated, err := env.svc.RenameEntry(ctx, subID, true, "New Subfolder Name", child.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Assets.Folders[0].Children[0].Name != "New Subfolder Name" {
		t.Fatalf("want renamed got %+v", updated.Assets.Folders[0].Children[0])
	}
}

func TestDeleteFolder_RemovesLeafFolder(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	created, err := env.svc.CreateFolder(ctx, "To Delete", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	updated, err := env.svc.DeleteEntry(ctx, created.Assets.Folders[0].ID, true, created.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	if len(updated.Assets.Folders) != 0 {
		t.Fatalf("want no folders got %+v", updated.Assets.Folders)
	}
}

func TestDeleteFolder_ClearsFolderIdOnAssets(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	created, err := env.svc.CreateFolder(ctx, "Folder", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	folderID := created.Assets.Folders[0].ID
	withAsset, err := env.svc.UpsertAsset(ctx, "asset-1", "test.png", "image/png", []byte{0x01, 0x02, 0x03}, &folderID, created.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	updated, err := env.svc.DeleteEntry(ctx, folderID, true, withAsset.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	if len(updated.Assets.Folders) != 0 {
		t.Fatalf("want no folders got %+v", updated.Assets.Folders)
	}
	if len(updated.Assets.Items) != 1 {
		t.Fatalf("want 1 asset got %d", len(updated.Assets.Items))
	}
	if updated.Assets.Items[0].FolderID != nil {
		t.Fatalf("want nil folder got %+v", updated.Assets.Items[0].FolderID)
	}
}

func TestMoveAsset_ChangesFolderId(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	folder, err := env.svc.CreateFolder(ctx, "Target", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	withAsset, err := env.svc.UpsertAsset(ctx, "asset-1", "test.png", "image/png", []byte{0x01, 0x02, 0x03}, nil, folder.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	updated, err := env.svc.MoveAsset(ctx, "asset-1", folder.Assets.Folders[0].ID, withAsset.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Assets.Items[0].FolderID == nil || *updated.Assets.Items[0].FolderID != folder.Assets.Folders[0].ID {
		t.Fatalf("want folder %q got %+v", folder.Assets.Folders[0].ID, updated.Assets.Items[0].FolderID)
	}
}

func TestMoveAsset_ClearsFolderId_WhenTargetIsEmpty(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	folder, err := env.svc.CreateFolder(ctx, "Folder", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	folderID := folder.Assets.Folders[0].ID
	withAsset, err := env.svc.UpsertAsset(ctx, "asset-1", "test.png", "image/png", []byte{0x01, 0x02, 0x03}, &folderID, folder.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	updated, err := env.svc.MoveAsset(ctx, "asset-1", "", withAsset.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Assets.Items[0].FolderID != nil {
		t.Fatalf("want nil folder got %+v", updated.Assets.Items[0].FolderID)
	}
}

func TestMoveAsset_NormalizesWhitespaceTargetFolderToRoot(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	folder, err := env.svc.CreateFolder(ctx, "Folder", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	folderID := folder.Assets.Folders[0].ID
	withAsset, err := env.svc.UpsertAsset(ctx, "asset-1", "test.png", "image/png", []byte{0x01, 0x02, 0x03}, &folderID, folder.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	updated, err := env.svc.MoveAsset(ctx, "asset-1", "   ", withAsset.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Assets.Items[0].FolderID != nil {
		t.Fatalf("want nil folder got %+v", updated.Assets.Items[0].FolderID)
	}
}

func TestTransferEntry_CopyAsset_CreatesNewAssetInTargetFolder(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	folder, err := env.svc.CreateFolder(ctx, "Target", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	withAsset, err := env.svc.UpsertAsset(ctx, "asset-1", "test.png", "image/png", []byte{0x01, 0x02, 0x03}, nil, folder.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	target := folder.Assets.Folders[0].ID
	updated, err := env.svc.TransferEntry(ctx, "asset-1", assets.TransferInput{ShowVersion: withAsset.ShowVersion, TargetFolderID: &target, Copy: true})
	if err != nil {
		t.Fatal(err)
	}
	_ = updated
	st, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(st.Assets.Items) != 2 {
		t.Fatalf("want 2 assets got %d", len(st.Assets.Items))
	}
	var copy *domain.ShowAsset
	for i, a := range st.Assets.Items {
		if a.ID != "asset-1" {
			copy = &st.Assets.Items[i]
		}
	}
	if copy == nil {
		t.Fatal("want copied asset")
	}
	if copy.FolderID == nil || *copy.FolderID != target {
		t.Fatalf("want copy in target got %+v", copy.FolderID)
	}
}

func TestTransferEntry_MoveFolder_ReparentsFolder(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	root, err := env.svc.CreateFolder(ctx, "Root", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	child, err := env.svc.CreateFolder(ctx, "Child", root.Assets.Folders[0].ID, root.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	destination, err := env.svc.CreateFolder(ctx, "Destination", "", child.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	childID := child.Assets.Folders[0].Children[0].ID
	var destinationID string
	for _, f := range destination.Assets.Folders {
		if f.Name == "Destination" {
			destinationID = f.ID
		}
	}
	updated, err := env.svc.TransferEntry(ctx, childID, assets.TransferInput{ShowVersion: destination.ShowVersion, IsDirectory: true, TargetFolderID: &destinationID})
	if err != nil {
		t.Fatal(err)
	}
	var rootFolder, destinationFolder *domain.FolderNode
	for i, f := range updated.Assets.Folders {
		if f.Name == "Root" {
			rootFolder = &updated.Assets.Folders[i]
		}
		if f.Name == "Destination" {
			destinationFolder = &updated.Assets.Folders[i]
		}
	}
	if rootFolder == nil || destinationFolder == nil {
		t.Fatal("want root and destination folders")
	}
	if len(rootFolder.Children) != 0 {
		t.Fatalf("want root empty got %+v", rootFolder.Children)
	}
	found := false
	for _, c := range destinationFolder.Children {
		if c.Name == "Child" {
			found = true
		}
	}
	if !found {
		t.Fatalf("want Child under Destination got %+v", destinationFolder.Children)
	}
}

func TestTransferEntry_RejectsMissingTargetFolder_WithoutChangingSnapshot(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	folder, err := env.svc.CreateFolder(ctx, "Source", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	before, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	missing := "missing-folder"
	if _, err := env.svc.TransferEntry(ctx, folder.Assets.Folders[0].ID, assets.TransferInput{ShowVersion: before.ShowVersion, IsDirectory: true, TargetFolderID: &missing}); err == nil {
		t.Fatal("want missing target error")
	}
	after, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if after.ShowVersion != before.ShowVersion {
		t.Fatalf("want version %d got %d", before.ShowVersion, after.ShowVersion)
	}
}

func TestTransferEntry_RejectsFolderTransferIntoDescendant_WithoutChangingSnapshot(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	root, err := env.svc.CreateFolder(ctx, "Root", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	child, err := env.svc.CreateFolder(ctx, "Child", root.Assets.Folders[0].ID, root.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	before, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	childID := child.Assets.Folders[0].Children[0].ID
	if _, err := env.svc.TransferEntry(ctx, root.Assets.Folders[0].ID, assets.TransferInput{ShowVersion: before.ShowVersion, IsDirectory: true, TargetFolderID: &childID}); err == nil {
		t.Fatal("want descendant error")
	}
	after, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if after.ShowVersion != before.ShowVersion {
		t.Fatalf("want version %d got %d", before.ShowVersion, after.ShowVersion)
	}
}

func TestTransferEntry_RejectsNoOpFolderMove_WithoutChangingSnapshot(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	folder, err := env.svc.CreateFolder(ctx, "Source", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	before, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	empty := ""
	if _, err := env.svc.TransferEntry(ctx, folder.Assets.Folders[0].ID, assets.TransferInput{ShowVersion: before.ShowVersion, IsDirectory: true, TargetFolderID: &empty}); err == nil {
		t.Fatal("want no-op error")
	}
	after, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if after.ShowVersion != before.ShowVersion {
		t.Fatalf("want version %d got %d", before.ShowVersion, after.ShowVersion)
	}
}

func TestTransferEntry_CopyNestedFolder_CopiesChildrenAndAssets(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	source, err := env.svc.CreateFolder(ctx, "Source", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	nested, err := env.svc.CreateFolder(ctx, "Nested", source.Assets.Folders[0].ID, source.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	destination, err := env.svc.CreateFolder(ctx, "Destination", "", nested.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	nestedID := nested.Assets.Folders[0].Children[0].ID
	withAsset, err := env.svc.UpsertAsset(ctx, "asset-1", "test.png", "image/png", []byte{0x01}, &nestedID, destination.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	var destinationID string
	for _, f := range withAsset.Assets.Folders {
		if f.Name == "Destination" {
			destinationID = f.ID
		}
	}
	updated, err := env.svc.TransferEntry(ctx, source.Assets.Folders[0].ID, assets.TransferInput{ShowVersion: withAsset.ShowVersion, IsDirectory: true, TargetFolderID: &destinationID, Copy: true})
	if err != nil {
		t.Fatal(err)
	}
	var destFolder *domain.FolderNode
	for i, f := range updated.Assets.Folders {
		if f.Name == "Destination" {
			destFolder = &updated.Assets.Folders[i]
		}
	}
	if destFolder == nil {
		t.Fatal("want destination folder")
	}
	var copiedSource *domain.FolderNode
	for i, c := range destFolder.Children {
		if c.Name == "Source" {
			copiedSource = &destFolder.Children[i]
		}
	}
	if copiedSource == nil {
		t.Fatalf("want copied Source got %+v", destFolder.Children)
	}
	if copiedSource.ID == source.Assets.Folders[0].ID {
		t.Fatal("want new id for copied source")
	}
	if len(copiedSource.Children) != 1 {
		t.Fatalf("want 1 nested copy got %+v", copiedSource.Children)
	}
	if copiedSource.Children[0].ID == nestedID {
		t.Fatal("want new id for copied nested")
	}
	var copiedAsset *domain.ShowAsset
	for i, a := range updated.Assets.Items {
		if a.ID != "asset-1" {
			copiedAsset = &updated.Assets.Items[i]
		}
	}
	if copiedAsset == nil {
		t.Fatal("want copied asset")
	}
	if copiedAsset.FolderID == nil || *copiedAsset.FolderID != copiedSource.Children[0].ID {
		t.Fatalf("want asset in nested copy got %+v", copiedAsset.FolderID)
	}
}

func TestTransferEntry_RejectsFolderCopyIntoSelf_WithoutChangingSnapshot(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	folder, err := env.svc.CreateFolder(ctx, "Source", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	before, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	folderID := folder.Assets.Folders[0].ID
	if _, err := env.svc.TransferEntry(ctx, folderID, assets.TransferInput{ShowVersion: before.ShowVersion, IsDirectory: true, TargetFolderID: &folderID, Copy: true}); err == nil {
		t.Fatal("want self-copy error")
	}
	after, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if after.ShowVersion != before.ShowVersion {
		t.Fatalf("want version %d got %d", before.ShowVersion, after.ShowVersion)
	}
}

func TestTransferEntry_RejectsFolderCopyIntoDescendant_WithoutChangingSnapshot(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	root, err := env.svc.CreateFolder(ctx, "Root", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	child, err := env.svc.CreateFolder(ctx, "Child", root.Assets.Folders[0].ID, root.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	before, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	childID := child.Assets.Folders[0].Children[0].ID
	if _, err := env.svc.TransferEntry(ctx, root.Assets.Folders[0].ID, assets.TransferInput{ShowVersion: before.ShowVersion, IsDirectory: true, TargetFolderID: &childID, Copy: true}); err == nil {
		t.Fatal("want descendant copy error")
	}
	after, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if after.ShowVersion != before.ShowVersion {
		t.Fatalf("want version %d got %d", before.ShowVersion, after.ShowVersion)
	}
}

func TestTransferEntry_RejectsFolderCopyToMissingTarget_WithoutChangingSnapshot(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	folder, err := env.svc.CreateFolder(ctx, "Source", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	before, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	missing := "missing-folder"
	if _, err := env.svc.TransferEntry(ctx, folder.Assets.Folders[0].ID, assets.TransferInput{ShowVersion: before.ShowVersion, IsDirectory: true, TargetFolderID: &missing, Copy: true}); err == nil {
		t.Fatal("want missing target error")
	}
	after, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if after.ShowVersion != before.ShowVersion {
		t.Fatalf("want version %d got %d", before.ShowVersion, after.ShowVersion)
	}
}

type recordingBlobs struct {
	saved   map[string][]byte
	deleted []string
}

func (r *recordingBlobs) Save(id string, data []byte) error {
	if r.saved == nil {
		r.saved = map[string][]byte{}
	}
	r.saved[id] = data
	return nil
}

func (r *recordingBlobs) Read(id string) ([]byte, error) { return r.saved[id], nil }

func (r *recordingBlobs) Delete(id string) error {
	r.deleted = append(r.deleted, id)
	return nil
}

func newTestEnvWithBlobs(t *testing.T, blobs BlobStore) *testEnv {
	t.Helper()
	sqldb, err := sql.Open("sqlite", testStoreDSN())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { sqldb.Close() })
	now := time.Now()
	clock := realtime.NewClock(func() time.Time { return now })
	store := NewStore(bun.NewDB(sqldb, sqlitedialect.New()))
	hub := realtime.NewHub(clock, nil, logging.Discard())
	env := &testEnv{store: store, clock: clock, now: &now}
	env.svc = NewService(store, hub, clock, blobs)
	if err := store.EnsureSeeded(context.Background()); err != nil {
		t.Fatal(err)
	}
	return env
}

func TestTransferEntry_StaleAssetCopy_RollsBackCopiedFile(t *testing.T) {
	blobs := &recordingBlobs{}
	env := newTestEnvWithBlobs(t, blobs)
	ctx := context.Background()
	withAsset, err := env.svc.UpsertAsset(ctx, "asset-1", "test.png", "image/png", []byte{0x01}, nil, env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	root := ""
	if _, err := env.svc.TransferEntry(ctx, "asset-1", assets.TransferInput{ShowVersion: withAsset.ShowVersion - 1, TargetFolderID: &root, Copy: true}); err == nil {
		t.Fatal("want version drift error")
	}
	st, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(st.Assets.Items) != 1 {
		t.Fatalf("want 1 asset got %d", len(st.Assets.Items))
	}
	if len(blobs.deleted) != 1 || blobs.deleted[0] == "asset-1" {
		t.Fatalf("want cloned file rolled back got %v", blobs.deleted)
	}
}

func TestTransferEntry_StaleFolderCopy_RollsBackCopiedFiles(t *testing.T) {
	blobs := &recordingBlobs{}
	env := newTestEnvWithBlobs(t, blobs)
	ctx := context.Background()
	source, err := env.svc.CreateFolder(ctx, "Source", "", env.version(t))
	if err != nil {
		t.Fatal(err)
	}
	folderID := source.Assets.Folders[0].ID
	withAsset, err := env.svc.UpsertAsset(ctx, "asset-1", "test.png", "image/png", []byte{0x01}, &folderID, source.ShowVersion)
	if err != nil {
		t.Fatal(err)
	}
	root := ""
	if _, err := env.svc.TransferEntry(ctx, folderID, assets.TransferInput{ShowVersion: withAsset.ShowVersion - 1, IsDirectory: true, TargetFolderID: &root, Copy: true}); err == nil {
		t.Fatal("want version drift error")
	}
	st, err := env.store.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(st.Assets.Items) != 1 {
		t.Fatalf("want 1 asset got %d", len(st.Assets.Items))
	}
	if len(blobs.deleted) == 0 {
		t.Fatal("want copied files rolled back")
	}
	for _, id := range blobs.deleted {
		if id == "asset-1" {
			t.Fatal("want original kept")
		}
	}
}

func idsOf(events []domain.TimelineEvent) []int {
	ids := make([]int, 0, len(events))
	for _, e := range events {
		ids = append(ids, e.ID)
	}
	return ids
}

func TestSetSettingsAsync_RejectsStaleVersion(t *testing.T) {
	env := newTestEnv(t)
	if _, err := env.svc.SetSettings(context.Background(), 999, nil); err == nil {
		t.Fatal("want version drift error")
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
