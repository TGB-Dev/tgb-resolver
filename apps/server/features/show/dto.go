package show

import (
	"tgb-resolver/server/features/shared/domain"
)

type VersionedCommandRequest struct {
	ShowVersion int `json:"showVersion,omitempty"`
}

type SeekPlaybackRequest struct {
	ShowVersion int `json:"showVersion,omitempty"`
	EventID     int `json:"eventId,omitempty"`
}

type SetAutomationRequest struct {
	ShowVersion        int   `json:"showVersion,omitempty"`
	AutoResolveEnabled *bool `json:"autoResolveEnabled,omitempty"`
	AutoResolveSpeedMs *int  `json:"autoResolveSpeedMs,omitempty"`
	FullAutoEnabled    *bool `json:"fullAutoEnabled,omitempty"`
}

type SetSettingsRequest struct {
	ShowVersion int      `json:"showVersion,omitempty"`
	TickRate    *float64 `json:"tickRate,omitempty"`
}

type ImportXmlRequest struct {
	XML               string   `json:"xml" minLength:"1" maxLength:"10485760"`
	ExcludedUsernames []string `json:"excludedUsernames,omitempty"`
}

type ImportBundleRequest struct {
	Bytes string `json:"bytes" minLength:"1"`
}

type ImportXmlUsersRequest struct {
	XML string `json:"xml,omitempty"`
}

type ImportXmlUser struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Name     string `json:"name"`
}

type ResolveEventRenameRequest struct {
	ShowVersion int     `json:"showVersion,omitempty"`
	CustomName  *string `json:"customName,omitempty" maxLength:"100"`
}

type NonResolveEventPatchRequest struct {
	ShowVersion              int                        `json:"showVersion,omitempty"`
	TriggerOffsetSeconds     *float64                   `json:"triggerOffsetSeconds,omitempty"`
	RequireManualInteraction *bool                      `json:"requireManualInteraction,omitempty"`
	CustomName               *string                    `json:"customName,omitempty"`
	Custom                   *domain.CustomEventPayload `json:"custom,omitempty"`
}

type CreateTimelineEventRequest struct {
	ShowVersion              int                        `json:"showVersion,omitempty"`
	RelativeToEventID        int                        `json:"relativeToEventId,omitempty"`
	Before                   bool                       `json:"before,omitempty"`
	DurationSeconds          *float64                   `json:"durationSeconds,omitempty"`
	TriggerOffsetSeconds     *float64                   `json:"triggerOffsetSeconds,omitempty"`
	RequireManualInteraction *bool                      `json:"requireManualInteraction,omitempty"`
	CustomName               *string                    `json:"customName,omitempty" maxLength:"100"`
	Custom                   *domain.CustomEventPayload `json:"custom,omitempty"`
}

type MoveTimelineEventRequest struct {
	ShowVersion       int  `json:"showVersion,omitempty"`
	RelativeToEventID int  `json:"relativeToEventId,omitempty"`
	Before            bool `json:"before,omitempty"`
}

type PatchTimelineEventRequest struct {
	ShowVersion              int                        `json:"showVersion,omitempty"`
	DurationSeconds          *float64                   `json:"durationSeconds,omitempty"`
	UseDefaultDuration       bool                       `json:"useDefaultDuration,omitempty"`
	CustomName               *string                    `json:"customName,omitempty"`
	TriggerOffsetSeconds     *float64                   `json:"triggerOffsetSeconds,omitempty"`
	ClearTriggerOffset       bool                       `json:"clearTriggerOffset,omitempty"`
	RequireManualInteraction *bool                      `json:"requireManualInteraction,omitempty"`
	Custom                   *domain.CustomEventPayload `json:"custom,omitempty"`
}

type SetTimelineModeRequest struct {
	ShowVersion  int                 `json:"showVersion,omitempty"`
	TimelineMode domain.TimelineMode `json:"timelineMode,omitempty" enum:"Rw,Ro"`
}
