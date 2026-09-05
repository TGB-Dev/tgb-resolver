package show

import (
	"context"
	"errors"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/gin-gonic/gin"

	"tgb-resolver/server-go/features/shared/domain"
)

type showBody struct {
	Body domain.ShowState
}

func ok(st domain.ShowState) *showBody {
	return &showBody{Body: st}
}

const (
	opSetAutomation      = "TGBResolverServerFeaturesShowSetAutomationEndpoint"
	opStartPlayback      = "TGBResolverServerFeaturesShowStartPlaybackEndpoint"
	opResetPlayback      = "TGBResolverServerFeaturesShowResetPlaybackEndpoint"
	opSeekPlayback       = "TGBResolverServerFeaturesShowSeekPlaybackEndpoint"
	opSetSettings        = "TGBResolverServerFeaturesShowSetSettingsEndpoint"
	opGetShow            = "TGBResolverServerFeaturesShowGetShowEndpoint"
	opOptimizeShow       = "TGBResolverServerFeaturesShowOptimizeShowEndpoint"
	opClearShow          = "TGBResolverServerFeaturesShowClearShowEndpoint"
	opImportXML          = "TGBResolverServerFeaturesShowImportXmlEndpoint"
	opImportBundle       = "TGBResolverServerFeaturesShowImportBundleEndpoint"
	opImportXMLUsers     = "TGBResolverServerFeaturesShowImportXmlUsersEndpoint"
	opExportBundle       = "TGBResolverServerFeaturesShowExportBundleEndpoint"
	opRenameResolveEvent = "TGBResolverServerFeaturesShowRenameResolveEventEndpoint"
	opPatchNonResolve    = "TGBResolverServerFeaturesShowPatchNonResolveEventEndpoint"
	opEnableLive         = "TGBResolverServerFeaturesShowEnableLiveModeEndpoint"
	opDisableLive        = "TGBResolverServerFeaturesShowDisableLiveModeEndpoint"
	opCreateEvent        = "TGBResolverServerFeaturesShowCreateTimelineEventEndpoint"
	opMoveEvent          = "TGBResolverServerFeaturesShowMoveTimelineEventEndpoint"
	opPatchEvent         = "TGBResolverServerFeaturesShowPatchTimelineEventEndpoint"
	opDeleteEvent        = "TGBResolverServerFeaturesShowDeleteTimelineEventEndpoint"
	opSetTimelineMode    = "TGBResolverServerFeaturesShowSetTimelineModeEndpoint"
)

func driftError(err error) error {
	if errors.Is(err, domain.ErrVersionDrift) {
		return huma.Error409Conflict("show version drift: refetch snapshot")
	}
	return huma.Error400BadRequest(err.Error())
}

func RegisterShowRoutes(api huma.API, svc *Service) {
	huma.Register(api, huma.Operation{OperationID: opSetAutomation, Method: http.MethodPatch, Path: "/api/show/automation"},
		func(ctx context.Context, input *struct {
			Body SetAutomationRequest
		}) (*showBody, error) {
			st, err := svc.SetAutomation(ctx, AutomationPatch{
				ShowVersion:        input.Body.ShowVersion,
				AutoResolveEnabled: input.Body.AutoResolveEnabled,
				AutoResolveSpeedMs: input.Body.AutoResolveSpeedMs,
				FullAutoEnabled:    input.Body.FullAutoEnabled,
			})
			if err != nil {
				return nil, driftError(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opStartPlayback, Method: http.MethodPost, Path: "/api/playback/start"},
		func(ctx context.Context, input *struct {
			Body VersionedCommandRequest
		}) (*showBody, error) {
			st, err := svc.Start(ctx, input.Body.ShowVersion)
			if err != nil {
				return nil, driftError(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opResetPlayback, Method: http.MethodPost, Path: "/api/playback/reset"},
		func(ctx context.Context, input *struct {
			Body VersionedCommandRequest
		}) (*showBody, error) {
			st, err := svc.Reset(ctx, input.Body.ShowVersion)
			if err != nil {
				return nil, driftError(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opSeekPlayback, Method: http.MethodPost, Path: "/playback/seek"},
		func(ctx context.Context, input *struct {
			Body SeekPlaybackRequest
		}) (*showBody, error) {
			st, err := svc.Seek(ctx, input.Body.ShowVersion, input.Body.EventID)
			if err != nil {
				return nil, driftError(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opSetSettings, Method: http.MethodPatch, Path: "/api/show/settings"},
		func(ctx context.Context, input *struct {
			Body SetSettingsRequest
		}) (*showBody, error) {
			st, err := svc.SetSettings(ctx, input.Body.ShowVersion, input.Body.TickRate)
			if err != nil {
				return nil, driftError(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opGetShow, Method: http.MethodGet, Path: "/timeline"},
		func(ctx context.Context, _ *struct{}) (*showBody, error) {
			st, err := svc.Snapshot(ctx)
			if err != nil {
				return nil, err
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opOptimizeShow, Method: http.MethodPost, Path: "/api/show/optimize"},
		func(ctx context.Context, input *struct {
			Body VersionedCommandRequest
		}) (*showBody, error) {
			st, err := svc.Optimize(ctx, input.Body.ShowVersion)
			if err != nil {
				return nil, driftError(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opClearShow, Method: http.MethodPost, Path: "/api/show/clear"},
		func(ctx context.Context, input *struct {
			Body VersionedCommandRequest
		}) (*showBody, error) {
			st, err := svc.Clear(ctx, input.Body.ShowVersion)
			if err != nil {
				return nil, driftError(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opImportXML, Method: http.MethodPost, Path: "/import/xml"},
		func(ctx context.Context, input *struct {
			Body ImportXmlRequest
		}) (*showBody, error) {
			st, err := svc.ImportXML(ctx, input.Body.XML, input.Body.ExcludedUsernames)
			if err != nil {
				return nil, huma.Error422UnprocessableEntity("invalid xml import")
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opImportBundle, Method: http.MethodPost, Path: "/import/bundle"},
		func(ctx context.Context, input *struct {
			Body ImportBundleRequest
		}) (*showBody, error) {
			st, err := svc.ImportBundle(ctx, input.Body.Bytes)
			if err != nil {
				return nil, huma.Error422UnprocessableEntity("invalid bundle")
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opImportXMLUsers, Method: http.MethodPost, Path: "/import/xml/users"},
		func(ctx context.Context, input *struct {
			Body ImportXmlUsersRequest
		}) (*struct {
			Body []ImportXmlUser
		}, error) {
			users, err := svc.ImportXMLUsers(ctx, input.Body.XML)
			if err != nil {
				return nil, huma.Error422UnprocessableEntity("invalid xml")
			}
			out := make([]ImportXmlUser, 0, len(users))
			for _, u := range users {
				out = append(out, ImportXmlUser{ID: u.ID, Username: u.Username, Name: u.Name})
			}
			return &struct {
				Body []ImportXmlUser
			}{Body: out}, nil
		})

	huma.Register(api, huma.Operation{OperationID: opExportBundle, Method: http.MethodGet, Path: "/export/bundle"},
		func(ctx context.Context, _ *struct{}) (*struct {
			Body []byte
		}, error) {
			data, err := svc.ExportBundle(ctx)
			if err != nil {
				return nil, err
			}
			return &struct {
				Body []byte
			}{Body: data}, nil
		})

	huma.Register(api, huma.Operation{OperationID: opRenameResolveEvent, Method: http.MethodPatch, Path: "/api/show/events/resolve/{id}"},
		func(ctx context.Context, input *struct {
			ID   int `path:"id"`
			Body ResolveEventRenameRequest
		}) (*showBody, error) {
			st, err := svc.RenameResolveEvent(ctx, input.ID, RenameResolveInput{
				ShowVersion: input.Body.ShowVersion, CustomName: input.Body.CustomName,
			})
			if err != nil {
				return nil, driftError(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opPatchNonResolve, Method: http.MethodPatch, Path: "/api/show/events/non-resolve/{id}"},
		func(ctx context.Context, input *struct {
			ID   int `path:"id"`
			Body NonResolveEventPatchRequest
		}) (*showBody, error) {
			st, err := svc.PatchNonResolveEvent(ctx, input.ID, NonResolvePatch{
				ShowVersion:              input.Body.ShowVersion,
				TriggerOffsetSeconds:     input.Body.TriggerOffsetSeconds,
				RequireManualInteraction: input.Body.RequireManualInteraction,
				CustomName:               input.Body.CustomName, Custom: input.Body.Custom,
			})
			if err != nil {
				return nil, driftError(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opEnableLive, Method: http.MethodPost, Path: "/api/show/live"},
		func(ctx context.Context, _ *struct{}) (*showBody, error) {
			st, err := svc.SetLive(ctx, true)
			if err != nil {
				return nil, err
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opDisableLive, Method: http.MethodDelete, Path: "/api/show/live"},
		func(ctx context.Context, _ *struct{}) (*showBody, error) {
			st, err := svc.SetLive(ctx, false)
			if err != nil {
				return nil, err
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opCreateEvent, Method: http.MethodPost, Path: "/timeline/event"},
		func(ctx context.Context, input *struct {
			Body CreateTimelineEventRequest
		}) (*showBody, error) {
			st, err := svc.CreateEvent(ctx, CreateEventInput{
				ShowVersion: input.Body.ShowVersion, RelativeToEventID: input.Body.RelativeToEventID,
				Before: input.Body.Before, DurationSeconds: input.Body.DurationSeconds,
				TriggerOffsetSeconds:     input.Body.TriggerOffsetSeconds,
				RequireManualInteraction: input.Body.RequireManualInteraction,
				CustomName:               input.Body.CustomName, Custom: input.Body.Custom,
			})
			if err != nil {
				return nil, driftError(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opMoveEvent, Method: http.MethodPatch, Path: "/timeline/event/{id}/position"},
		func(ctx context.Context, input *struct {
			ID   int `path:"id"`
			Body MoveTimelineEventRequest
		}) (*showBody, error) {
			st, err := svc.MoveEvent(ctx, input.ID, MoveEventInput{
				ShowVersion:       input.Body.ShowVersion,
				RelativeToEventID: input.Body.RelativeToEventID, Before: input.Body.Before,
			})
			if err != nil {
				return nil, driftError(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opPatchEvent, Method: http.MethodPatch, Path: "/timeline/event/{id}"},
		func(ctx context.Context, input *struct {
			ID   int `path:"id"`
			Body PatchTimelineEventRequest
		}) (*showBody, error) {
			st, err := svc.PatchEvent(ctx, input.ID, PatchEventInput{
				ShowVersion: input.Body.ShowVersion, DurationSeconds: input.Body.DurationSeconds,
				UseDefaultDuration: input.Body.UseDefaultDuration, CustomName: input.Body.CustomName,
				TriggerOffsetSeconds:     input.Body.TriggerOffsetSeconds,
				ClearTriggerOffset:       input.Body.ClearTriggerOffset,
				RequireManualInteraction: input.Body.RequireManualInteraction,
				Custom:                   input.Body.Custom,
			})
			if err != nil {
				return nil, driftError(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opDeleteEvent, Method: http.MethodDelete, Path: "/timeline/event/{id}"},
		func(ctx context.Context, input *struct {
			ID   int `path:"id"`
			Body VersionedCommandRequest
		}) (*showBody, error) {
			st, err := svc.DeleteEvent(ctx, input.Body.ShowVersion, input.ID)
			if err != nil {
				return nil, driftError(err)
			}
			return ok(st), nil
		})

	huma.Register(api, huma.Operation{OperationID: opSetTimelineMode, Method: http.MethodPatch, Path: "/timeline/mode"},
		func(ctx context.Context, input *struct {
			Body SetTimelineModeRequest
		}) (*showBody, error) {
			st, err := svc.SetTimelineMode(ctx, input.Body.ShowVersion, input.Body.TimelineMode)
			if err != nil {
				return nil, driftError(err)
			}
			return ok(st), nil
		})
}

func SetupRouter(router *gin.Engine, svc *Service) {
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "TGB Resolver Server"})
	})
}
