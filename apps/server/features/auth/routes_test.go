package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humagin"
	"github.com/gin-gonic/gin"
)

func newTestEngine(t *testing.T, svc *Service, limiter *RateLimiter) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	engine.Use(Middleware(svc, limiter))
	api := humagin.New(engine, huma.DefaultConfig("test", "v1"))
	RegisterAuthRoutes(api, svc, nil)
	return engine
}

func doRequest(t *testing.T, engine *gin.Engine, method, path, token string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var reader *bytes.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		reader = bytes.NewReader(raw)
	} else {
		reader = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, reader)
	req.RemoteAddr = "192.168.1.20:1234"
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	engine.ServeHTTP(rec, req)
	return rec
}

func joinAs(t *testing.T, engine *gin.Engine, code string) (token, sessionID string) {
	t.Helper()
	rec := doRequest(t, engine, http.MethodPost, "/auth/join", "", map[string]string{"code": code})
	if rec.Code != http.StatusOK {
		t.Fatalf("join status %d: %s", rec.Code, rec.Body.String())
	}
	var out struct {
		Token     string `json:"token"`
		SessionID string `json:"sessionId"`
		Label     string `json:"label"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.Token == "" || out.Label == "" {
		t.Fatal("want token and label")
	}
	return out.Token, out.SessionID
}

func TestJoinWrongCode401(t *testing.T) {
	svc := newTestService(t, "TEST12", 30*time.Hour)
	if _, err := svc.EnsureSeeded(context.Background()); err != nil {
		t.Fatal(err)
	}
	engine := newTestEngine(t, svc, NewRateLimiter(10, time.Minute))
	rec := doRequest(t, engine, http.MethodPost, "/auth/join", "", map[string]string{"code": "nope12"})
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", rec.Code)
	}
}

func TestSessionsRequireAuth(t *testing.T) {
	svc := newTestService(t, "TEST12", 30*time.Hour)
	if _, err := svc.EnsureSeeded(context.Background()); err != nil {
		t.Fatal(err)
	}
	engine := newTestEngine(t, svc, NewRateLimiter(10, time.Minute))
	if rec := doRequest(t, engine, http.MethodGet, "/auth/sessions", "", nil); rec.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", rec.Code)
	}
	token, _ := joinAs(t, engine, "TEST12")
	rec := doRequest(t, engine, http.MethodGet, "/auth/sessions", token, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestRotateKeepsSessionOverHTTP(t *testing.T) {
	svc := newTestService(t, "TEST12", 30*time.Hour)
	if _, err := svc.EnsureSeeded(context.Background()); err != nil {
		t.Fatal(err)
	}
	engine := newTestEngine(t, svc, NewRateLimiter(10, time.Minute))
	token, _ := joinAs(t, engine, "TEST12")
	rec := doRequest(t, engine, http.MethodPost, "/auth/rotate", token, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("rotate want 200, got %d", rec.Code)
	}
	rec = doRequest(t, engine, http.MethodGet, "/auth/sessions", token, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("old session must survive rotate, got %d", rec.Code)
	}
	rec = doRequest(t, engine, http.MethodPost, "/auth/join", "", map[string]string{"code": "TEST12"})
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("old code must die, got %d", rec.Code)
	}
}

func TestRevokeUnknown404AndSelf400(t *testing.T) {
	svc := newTestService(t, "TEST12", 30*time.Hour)
	if _, err := svc.EnsureSeeded(context.Background()); err != nil {
		t.Fatal(err)
	}
	engine := newTestEngine(t, svc, NewRateLimiter(10, time.Minute))
	token, sessionID := joinAs(t, engine, "TEST12")
	if rec := doRequest(t, engine, http.MethodDelete, "/auth/sessions/does-not-exist", token, nil); rec.Code != http.StatusNotFound {
		t.Fatalf("want 404, got %d", rec.Code)
	}
	if rec := doRequest(t, engine, http.MethodDelete, "/auth/sessions/"+sessionID, token, nil); rec.Code != http.StatusBadRequest {
		t.Fatalf("self-kick want 400, got %d", rec.Code)
	}
}

func TestJoinRateLimited429(t *testing.T) {
	svc := newTestService(t, "TEST12", 30*time.Hour)
	if _, err := svc.EnsureSeeded(context.Background()); err != nil {
		t.Fatal(err)
	}
	engine := newTestEngine(t, svc, NewRateLimiter(2, time.Minute))
	joinAs(t, engine, "TEST12")
	joinAs(t, engine, "TEST12")
	rec := doRequest(t, engine, http.MethodPost, "/auth/join", "", map[string]string{"code": "TEST12"})
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("want 429, got %d", rec.Code)
	}
}
