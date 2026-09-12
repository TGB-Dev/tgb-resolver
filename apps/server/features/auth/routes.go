package auth

import (
	"context"
	"errors"
	"net/http"

	"github.com/danielgtaylor/huma/v2"

	"tgb-resolver/server/features/shared/logging"
)

var routeLog = logging.For("auth")

type joinInput struct {
	Body struct {
		Code string `json:"code"`
	}
}

type joinOutput struct {
	Body struct {
		Token     string `json:"token"`
		SessionID string `json:"sessionId"`
		Label     string `json:"label"`
		ExpiresAt string `json:"expiresAt"`
	}
}

type codeOutput struct {
	Body struct {
		Code string `json:"code"`
	}
}

type sessionDTO struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	CreatedAt string `json:"createdAt"`
	LastSeen  string `json:"lastSeen"`
	ExpiresAt string `json:"expiresAt"`
}

type sessionsOutput struct {
	Body []sessionDTO
}

type revokeInput struct {
	ID            string `path:"id"`
	Authorization string `header:"Authorization"`
}

func toDTO(s SessionInfo) sessionDTO {
	return sessionDTO{
		ID:        s.ID,
		Label:     s.Label,
		CreatedAt: s.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		LastSeen:  s.LastSeen.UTC().Format("2006-01-02T15:04:05Z"),
		ExpiresAt: s.ExpiresAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}

func RegisterAuthRoutes(api huma.API, svc *Service, onRevoke func(sessionID string)) {
	huma.Register(api, huma.Operation{OperationID: "TGBResolverServerFeaturesAuthJoinEndpoint", Method: http.MethodPost, Path: "/auth/join"},
		func(ctx context.Context, input *joinInput) (*joinOutput, error) {
			out, err := svc.Join(ctx, input.Body.Code)
			if err != nil {
				if errors.Is(err, ErrInvalidCode) {
					return nil, huma.Error401Unauthorized("invalid join code")
				}
				routeLog.Error().Err(err).Msg("join failed")
				return nil, huma.Error500InternalServerError("cannot join right now")
			}
			resp := &joinOutput{}
			resp.Body.Token = out.Token
			resp.Body.SessionID = out.SessionID
			resp.Body.Label = out.Label
			resp.Body.ExpiresAt = out.ExpiresAt.UTC().Format("2006-01-02T15:04:05Z")
			return resp, nil
		})

	huma.Register(api, huma.Operation{OperationID: "TGBResolverServerFeaturesAuthJoinCodeEndpoint", Method: http.MethodGet, Path: "/auth/join-code"},
		func(ctx context.Context, _ *struct{}) (*codeOutput, error) {
			code, err := svc.CurrentCode(ctx)
			if err != nil {
				routeLog.Error().Err(err).Msg("load join code failed")
				return nil, huma.Error500InternalServerError("cannot load join code")
			}
			resp := &codeOutput{}
			resp.Body.Code = code
			return resp, nil
		})

	huma.Register(api, huma.Operation{OperationID: "TGBResolverServerFeaturesAuthRotateEndpoint", Method: http.MethodPost, Path: "/auth/rotate"},
		func(ctx context.Context, _ *struct{}) (*codeOutput, error) {
			code, err := svc.Rotate(ctx)
			if err != nil {
				routeLog.Error().Err(err).Msg("rotate failed")
				return nil, huma.Error500InternalServerError("cannot rotate join code")
			}
			resp := &codeOutput{}
			resp.Body.Code = code
			return resp, nil
		})

	huma.Register(api, huma.Operation{OperationID: "TGBResolverServerFeaturesAuthSessionsEndpoint", Method: http.MethodGet, Path: "/auth/sessions"},
		func(ctx context.Context, _ *struct{}) (*sessionsOutput, error) {
			sessions, err := svc.List(ctx)
			if err != nil {
				routeLog.Error().Err(err).Msg("list sessions failed")
				return nil, huma.Error500InternalServerError("cannot list sessions")
			}
			out := make([]sessionDTO, 0, len(sessions))
			for _, s := range sessions {
				out = append(out, toDTO(s))
			}
			return &sessionsOutput{Body: out}, nil
		})

	huma.Register(api, huma.Operation{OperationID: "TGBResolverServerFeaturesAuthRevokeEndpoint", Method: http.MethodDelete, Path: "/auth/sessions/{id}"},
		func(ctx context.Context, input *revokeInput) (*struct{}, error) {
			caller, err := svc.Verify(BearerToken(input.Authorization))
			if err != nil {
				return nil, huma.Error401Unauthorized("unauthorized")
			}
			if input.ID == caller.ID {
				return nil, huma.Error400BadRequest("cannot kick your own session")
			}
			if err := svc.Revoke(ctx, input.ID); err != nil {
				if errors.Is(err, ErrInvalidToken) {
					return nil, huma.Error404NotFound("session not found")
				}
				routeLog.Error().Err(err).Str("session", input.ID).Msg("revoke failed")
				return nil, huma.Error500InternalServerError("cannot kick right now")
			}
			if onRevoke != nil {
				onRevoke(input.ID)
			}
			return nil, nil
		})
}
