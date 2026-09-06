package show

import (
	"encoding/json"

	"tgb-resolver/server/features/shared/domain"
	showv1 "tgb-resolver/server/proto/gen/show/v1"
)

func toResolvePayload(p *domain.ResolveEventPayload) *showv1.ResolvePayload {
	if p == nil {
		return nil
	}
	return &showv1.ResolvePayload{
		UserId: int32(p.UserID), ProblemId: int32(p.ProblemID),
		NewTotalScore: p.NewTotalScore, NewTotalPenalty: p.NewTotalPenalty,
		NewRank: int32(p.NewRank), NewProblemScore: p.NewProblemScore,
		Verdict: string(p.Verdict), TimeSinceStart: p.TimeSinceStart,
	}
}

func toCustomPayload(p *domain.CustomEventPayload) *showv1.CustomPayload {
	if p == nil {
		return nil
	}
	out := &showv1.CustomPayload{ExtId: p.ExtID}
	if p.ExtPayload != nil {
		if raw, err := json.Marshal(p.ExtPayload); err == nil {
			out.ExtPayloadJson = raw
		}
	}
	return out
}

func toEventSnapshot(e domain.TimelineEvent) *showv1.TimelineEventSnapshot {
	return &showv1.TimelineEventSnapshot{
		Id: int32(e.ID), Position: int32(e.Position), Type: string(e.Type),
		DurationSeconds:          e.DurationSeconds,
		TriggerOffsetSeconds:     e.TriggerOffsetSeconds,
		RequireManualInteraction: e.RequireManualInteraction,
		CustomName:               e.CustomName,
		Resolve:                  toResolvePayload(e.Resolve), Pre: toResolvePayload(e.Pre),
		Custom: toCustomPayload(e.Custom),
	}
}

func (s *Service) broadcastPlayback(st domain.ShowState) {
	pb := &showv1.PlaybackSnapshot{Status: string(st.Playback.Status)}
	if st.Playback.CurrentEventID != nil {
		id := int32(*st.Playback.CurrentEventID)
		pb.CurrentEventId = &id
	}
	for _, id := range st.Playback.ActiveEventIDs {
		pb.ActiveEventIds = append(pb.ActiveEventIds, int32(id))
	}
	pb.StartedAtUnixMs = st.Playback.StartedAt
	s.hub.Broadcast(&showv1.Envelope{Type: "PlaybackStateChanged",
		Payload: &showv1.Envelope_PlaybackStateChanged{PlaybackStateChanged: &showv1.PlaybackStateChanged{
			ShowVersion: int32(st.ShowVersion), Playback: pb,
			ServerTimeUnixMs: s.clock.Now().UnixMilli()}}})
}

func (s *Service) broadcastAdded(updated domain.ShowState, eventID int) {
	for _, e := range updated.Timeline {
		if e.ID != eventID {
			continue
		}
		s.hub.Broadcast(&showv1.Envelope{Type: "TimelineEventAdded",
			Payload: &showv1.Envelope_TimelineEventAdded{TimelineEventAdded: &showv1.TimelineEventAdded{
				ShowVersion: int32(updated.ShowVersion), Event: toEventSnapshot(e)}}})
	}
}

func (s *Service) broadcastUpdated(updated domain.ShowState, eventID int) {
	for _, e := range updated.Timeline {
		if e.ID != eventID {
			continue
		}
		s.hub.Broadcast(&showv1.Envelope{Type: "TimelineEventUpdated",
			Payload: &showv1.Envelope_TimelineEventUpdated{TimelineEventUpdated: &showv1.TimelineEventUpdated{
				ShowVersion: int32(updated.ShowVersion), Event: toEventSnapshot(e)}}})
	}
}

func (s *Service) broadcastReordered(updated domain.ShowState) {
	ids := make([]int32, 0, len(updated.Timeline))
	for _, e := range ordered(updated.Timeline) {
		ids = append(ids, int32(e.ID))
	}
	s.hub.Broadcast(&showv1.Envelope{Type: "TimelineReordered",
		Payload: &showv1.Envelope_TimelineReordered{TimelineReordered: &showv1.TimelineReordered{
			ShowVersion: int32(updated.ShowVersion), OrderedEventIds: ids}}})
}

func (s *Service) broadcastReplaced(updated domain.ShowState) {
	s.hub.Broadcast(&showv1.Envelope{Type: "ShowReplaced",
		Payload: &showv1.Envelope_ShowReplaced{ShowReplaced: &showv1.ShowReplaced{
			ShowVersion: int32(updated.ShowVersion)}}})
}
