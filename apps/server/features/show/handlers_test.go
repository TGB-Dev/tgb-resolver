package show

import (
	"context"
	"database/sql"
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humagin"
	"github.com/gin-gonic/gin"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	_ "modernc.org/sqlite"

	"tgb-resolver/server/features/realtime"
)

type nilBlobs struct{}

func (nilBlobs) Save(id string, data []byte) error { return nil }
func (nilBlobs) Read(id string) ([]byte, error)    { return nil, nil }
func (nilBlobs) Delete(id string) error            { return nil }

func setupTestRouter(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	sqldb, err := sql.Open("sqlite", "file::memory:?cache=shared")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { sqldb.Close() })
	store := NewStore(bun.NewDB(sqldb, sqlitedialect.New()))
	clock := realtime.NewClock(nil)
	hub := realtime.NewHub(clock, nil)
	svc := NewService(store, hub, clock, nilBlobs{})
	if err := store.EnsureSeeded(context.Background()); err != nil {
		t.Fatal(err)
	}
	router := gin.New()
	SetupRouter(router, svc)
	api := humagin.New(router, huma.DefaultConfig("TGB Resolver Server", "v1"))
	RegisterShowRoutes(api, svc)
	return router
}

func TestRootReturnsOK(t *testing.T) {
	router := setupTestRouter(t)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200 got %d", w.Code)
	}
}

func TestStaleVersionIsConflict(t *testing.T) {
	router := setupTestRouter(t)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/show/clear", strings.NewReader(`{"showVersion":999}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	if w.Code != http.StatusConflict {
		t.Fatalf("want 409 got %d: %s", w.Code, w.Body.String())
	}
}

func TestImportBundleAcceptsBodiesOverOneMB(t *testing.T) {
	router := setupTestRouter(t)
	payload := `{"bytes":"` + base64.StdEncoding.EncodeToString(make([]byte, 1500*1024)) + `"}`
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/import/bundle", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	if w.Code == http.StatusRequestEntityTooLarge {
		t.Fatalf("want bundle over 1MB accepted, got 413")
	}
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("want 422 invalid bundle got %d: %s", w.Code, w.Body.String()[:200])
	}
}

func TestGetTimelineReturnsSeed(t *testing.T) {
	router := setupTestRouter(t)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/timeline", nil)
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200 got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), `"type":"Res"`) {
		t.Fatalf("want Res events in body: %s", w.Body.String())
	}
}
