package domain

import "github.com/danielgtaylor/huma/v2"

type ShowMode string

const (
	ShowModeEditing ShowMode = "Editing"
	ShowModeLive    ShowMode = "Live"
)

func (m ShowMode) Schema(r huma.Registry) *huma.Schema {
	return &huma.Schema{Type: huma.TypeString, Enum: []any{"Editing", "Live"}}
}

type TimelineMode string

const (
	TimelineRw TimelineMode = "Rw"
	TimelineRo TimelineMode = "Ro"
)

type ShowSource string

const (
	ShowSourceXml    ShowSource = "Xml"
	ShowSourceBundle ShowSource = "Bundle"
	ShowSourceManual ShowSource = "Manual"
)

type PlaybackStatus string

const (
	PlaybackIdle    PlaybackStatus = "Idle"
	PlaybackRunning PlaybackStatus = "Running"
	PlaybackPaused  PlaybackStatus = "Paused"
)

func (s PlaybackStatus) Schema(r huma.Registry) *huma.Schema {
	return &huma.Schema{Type: huma.TypeString, Enum: []any{"Idle", "Running", "Paused"}}
}

type TimelineEventType string

const (
	TimelineRes TimelineEventType = "Res"
	TimelinePre TimelineEventType = "Pre"
	TimelineImg TimelineEventType = "Img"
	TimelineSfx TimelineEventType = "Sfx"
	TimelineCus TimelineEventType = "Cus"
)

func (t TimelineEventType) Schema(r huma.Registry) *huma.Schema {
	return &huma.Schema{Type: huma.TypeString, Enum: []any{"Res", "Pre", "Img", "Sfx", "Cus"}}
}

type VerdictRunResult string

const (
	VerdictUnknown             VerdictRunResult = "Unknown"
	VerdictAccepted            VerdictRunResult = "Accepted"
	VerdictWrongAnswer         VerdictRunResult = "WrongAnswer"
	VerdictTimeLimitExceeded   VerdictRunResult = "TimeLimitExceeded"
	VerdictMemoryLimitExceeded VerdictRunResult = "MemoryLimitExceeded"
	VerdictOutputLimitExceeded VerdictRunResult = "OutputLimitExceeded"
	VerdictInvalidReturn       VerdictRunResult = "InvalidReturn"
	VerdictRuntimeError        VerdictRunResult = "RuntimeError"
	VerdictCompileError        VerdictRunResult = "CompileError"
	VerdictInternalError       VerdictRunResult = "InternalError"
	VerdictShortCircuited      VerdictRunResult = "ShortCircuited"
	VerdictAborted             VerdictRunResult = "Aborted"
	VerdictUnresolved          VerdictRunResult = "Unresolved"
	VerdictPending             VerdictRunResult = "Pending"
)
