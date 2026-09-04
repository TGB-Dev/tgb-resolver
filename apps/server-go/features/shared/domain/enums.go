package domain

import "github.com/danielgtaylor/huma/v2"

type ShowMode string

const (
	ShowModeLive    ShowMode = "Live"
	ShowModePreview ShowMode = "Preview"
)

func (m ShowMode) Schema(r huma.Registry) *huma.Schema {
	return &huma.Schema{Type: huma.TypeString, Enum: []any{"Live", "Preview"}}
}

type ShowSource string

const (
	ShowSourceManual ShowSource = "Manual"
	ShowSourceImport ShowSource = "Import"
)

type PlaybackStatus string

const (
	PlaybackIdle    PlaybackStatus = "Idle"
	PlaybackPlaying PlaybackStatus = "Playing"
	PlaybackPaused  PlaybackStatus = "Paused"
)

func (s PlaybackStatus) Schema(r huma.Registry) *huma.Schema {
	return &huma.Schema{Type: huma.TypeString, Enum: []any{"Idle", "Playing", "Paused"}}
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
	VerdictAccepted VerdictRunResult = "Accepted"
	VerdictRejected VerdictRunResult = "Rejected"
	VerdictPending  VerdictRunResult = "Pending"
)
