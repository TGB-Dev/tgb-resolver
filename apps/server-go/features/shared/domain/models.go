package domain

import "errors"

var ErrVersionDrift = errors.New("show version drift: refetch snapshot")

type ShowState struct {
	SchemaVersion int             `json:"schemaVersion"`
	ShowVersion   int             `json:"showVersion"`
	Mode          ShowMode        `json:"mode"`
	Source        ShowSource      `json:"source"`
	Timeline      []TimelineEvent `json:"timeline"`
	TickRate      *float64        `json:"tickRate,omitempty"`
}

type TimelineEvent struct {
	ID         int               `json:"id"`
	Position   int               `json:"position"`
	Type       TimelineEventType `json:"type"`
	CustomName *string           `json:"customName,omitempty"`
}

func EmptyShow(src ShowSource) ShowState {
	return ShowState{Mode: ShowModePreview, Source: src, Timeline: nil}
}
