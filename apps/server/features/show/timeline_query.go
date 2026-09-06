package show

import (
	"sort"

	"tgb-resolver/server/features/shared/domain"
)

func ordered(timeline []domain.TimelineEvent) []domain.TimelineEvent {
	out := append([]domain.TimelineEvent{}, timeline...)
	sort.Slice(out, func(i, j int) bool { return out[i].Position < out[j].Position })
	return out
}

func indexOf(ord []domain.TimelineEvent, id int) int {
	for i, e := range ord {
		if e.ID == id {
			return i
		}
	}
	return -1
}

func computeActiveEventIDs(ord []domain.TimelineEvent, currentIndex int) []int {
	if currentIndex < 0 || currentIndex >= len(ord) {
		return []int{}
	}
	parent := currentIndex
	for parent > 0 && ord[parent].TriggerOffsetSeconds != nil {
		parent--
	}
	ids := []int{}
	for i := parent; i <= currentIndex; i++ {
		ids = append(ids, ord[i].ID)
	}
	for i := currentIndex + 1; i < len(ord); i++ {
		if ord[i].TriggerOffsetSeconds == nil || *ord[i].TriggerOffsetSeconds != 0 {
			break
		}
		ids = append(ids, ord[i].ID)
	}
	return ids
}
