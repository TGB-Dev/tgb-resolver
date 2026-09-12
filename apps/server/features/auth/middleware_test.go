package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"tgb-resolver/server/features/shared/logging"
)

func newAssetEngine(t *testing.T, svc *Service) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	engine.Use(Middleware(svc, NewRateLimiter(10, time.Minute), logging.Discard()))
	engine.GET("/assets/:id", func(c *gin.Context) {
		c.String(http.StatusOK, "bytes")
	})
	return engine
}

func TestAssetRead_AcceptsQueryToken(t *testing.T) {
	svc := newTestService(t, "TEST12", 30*time.Hour)
	if _, err := svc.EnsureSeeded(context.Background()); err != nil {
		t.Fatal(err)
	}
	out, err := svc.Join(context.Background(), "TEST12")
	if err != nil {
		t.Fatal(err)
	}
	engine := newAssetEngine(t, svc)

	bearer := httptest.NewRequest(http.MethodGet, "/assets/abc", nil)
	bearer.Header.Set("Authorization", "Bearer "+out.Token)
	rec := httptest.NewRecorder()
	engine.ServeHTTP(rec, bearer)
	if rec.Code != http.StatusOK {
		t.Fatalf("bearer want 200, got %d", rec.Code)
	}

	query := httptest.NewRequest(http.MethodGet, "/assets/abc?token="+out.Token, nil)
	rec = httptest.NewRecorder()
	engine.ServeHTTP(rec, query)
	if rec.Code != http.StatusOK {
		t.Fatalf("query token want 200, got %d", rec.Code)
	}

	anon := httptest.NewRequest(http.MethodGet, "/assets/abc", nil)
	anon.RemoteAddr = "192.168.1.20:1234"
	rec = httptest.NewRecorder()
	engine.ServeHTTP(rec, anon)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous want 401, got %d", rec.Code)
	}

	wrong := httptest.NewRequest(http.MethodGet, "/assets/abc?token=nope", nil)
	rec = httptest.NewRecorder()
	engine.ServeHTTP(rec, wrong)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("bad token want 401, got %d", rec.Code)
	}
}
