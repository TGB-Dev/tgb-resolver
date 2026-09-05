package domain

import "errors"

var ErrVersionDrift = errors.New("show version drift: refetch snapshot")

type ShowState struct {
	SchemaVersion int             `json:"schemaVersion"`
	ShowVersion   int             `json:"showVersion"`
	Mode          ShowMode        `json:"mode"`
	TimelineMode  TimelineMode    `json:"timelineMode"`
	Meta          ShowMeta        `json:"meta"`
	Contest       ContestState    `json:"contest"`
	Automation    AutomationState `json:"automation"`
	Playback      PlaybackState   `json:"playback"`
	Assets        AssetCollection `json:"assets"`
	Timeline      []TimelineEvent `json:"timeline"`
	TickRate      *float64        `json:"tickRate,omitempty"`
}

type ShowMeta struct {
	Title     string     `json:"title"`
	ContestID *string    `json:"contestId,omitempty"`
	Source    ShowSource `json:"source"`
}

type ContestState struct {
	DurationSeconds       int                   `json:"durationSeconds"`
	FreezeDurationSeconds int                   `json:"freezeDurationSeconds"`
	Problems              []ProblemDefinition   `json:"problems"`
	Users                 []UserDefinition      `json:"users"`
	PreFreezeSnapshot     []FreezeSnapshotEntry `json:"preFreezeSnapshot"`
}

type ProblemDefinition struct {
	ID    int     `json:"id"`
	Label string  `json:"label"`
	Name  string  `json:"name"`
	Score float64 `json:"score"`
}

type UserDefinition struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	RealName string `json:"realName"`
}

type FreezeSnapshotEntry struct {
	UserID               int                   `json:"userId"`
	TotalScore           float64               `json:"totalScore"`
	TotalPenalty         float64               `json:"totalPenalty"`
	Rank                 int                   `json:"rank"`
	Problems             []ProblemFreezeResult `json:"problems"`
	LastRunID            *int                  `json:"lastRunId,omitempty"`
	LastSubmittedSeconds *float64              `json:"lastSubmittedSeconds,omitempty"`
}

type ProblemFreezeResult struct {
	ProblemID                 int              `json:"problemId"`
	Score                     float64          `json:"score"`
	Verdict                   VerdictRunResult `json:"verdict"`
	PreFreezeSubmissionCount  int              `json:"preFreezeSubmissionCount"`
	PostFreezeSubmissionCount int              `json:"postFreezeSubmissionCount"`
}

type AutomationState struct {
	AutoResolveEnabled bool `json:"autoResolveEnabled"`
	AutoResolveSpeedMs int  `json:"autoResolveSpeedMs"`
	FullAutoEnabled    bool `json:"fullAutoEnabled"`
}

type PlaybackState struct {
	Status         PlaybackStatus `json:"status"`
	CurrentEventID *int           `json:"currentEventId,omitempty"`
	ActiveEventIDs []int          `json:"activeEventIds"`
	StartedAt      *int64         `json:"startedAt,omitempty"`
}

type AssetCollection struct {
	Items   []ShowAsset  `json:"items"`
	Folders []FolderNode `json:"folders"`
}

type ShowAsset struct {
	ID           string  `json:"id"`
	FileName     string  `json:"fileName"`
	OriginalName string  `json:"originalName"`
	ContentType  string  `json:"contentType"`
	SizeBytes    int64   `json:"sizeBytes"`
	Xxh3         string  `json:"xxh3"`
	FolderID     *string `json:"folderId,omitempty"`
}

type FolderNode struct {
	ID       string       `json:"id"`
	Name     string       `json:"name"`
	Children []FolderNode `json:"children"`
}

type TimelineEvent struct {
	ID                       int                  `json:"id"`
	Position                 int                  `json:"position"`
	Type                     TimelineEventType    `json:"type"`
	DurationSeconds          *float64             `json:"durationSeconds,omitempty"`
	TriggerOffsetSeconds     *float64             `json:"triggerOffsetSeconds,omitempty"`
	RequireManualInteraction *bool                `json:"requireManualInteraction,omitempty"`
	CustomName               *string              `json:"customName,omitempty"`
	Resolve                  *ResolveEventPayload `json:"resolve,omitempty"`
	Pre                      *ResolveEventPayload `json:"pre,omitempty"`
	Custom                   *CustomEventPayload  `json:"custom,omitempty"`
}

type CustomEventPayload struct {
	ExtID      string         `json:"extId"`
	ExtPayload map[string]any `json:"extPayload,omitempty"`
}

type ResolveEventPayload struct {
	UserID          int              `json:"userId"`
	ProblemID       int              `json:"problemId"`
	NewTotalScore   float64          `json:"newTotalScore"`
	NewTotalPenalty float64          `json:"newTotalPenalty"`
	NewRank         int              `json:"newRank"`
	NewProblemScore float64          `json:"newProblemScore"`
	Verdict         VerdictRunResult `json:"verdict"`
	TimeSinceStart  float64          `json:"timeSinceStart"`
}

func EmptyShow(src ShowSource) ShowState {
	return ShowState{Mode: ShowModeEditing, Timeline: nil}
}
