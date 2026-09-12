package auth

import (
	"context"
	"database/sql"
	"fmt"
	"sync/atomic"
	"testing"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	_ "modernc.org/sqlite"
)

var testAuthSeq atomic.Int64

func newTestService(t *testing.T, seedCode string, ttl time.Duration) *Service {
	t.Helper()
	dsn := fmt.Sprintf("file:authmemdb%d?mode=memory&cache=shared", testAuthSeq.Add(1))
	sqldb, err := sql.Open("sqlite", dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { sqldb.Close() })
	return NewService(bun.NewDB(sqldb, sqlitedialect.New()), seedCode, ttl, time.Now)
}

func TestJoinThenVerify(t *testing.T) {
	svc := newTestService(t, "TEST12", 30*time.Hour)
	ctx := context.Background()
	if _, err := svc.EnsureSeeded(ctx); err != nil {
		t.Fatal(err)
	}
	out, err := svc.Join(ctx, "test12")
	if err != nil {
		t.Fatalf("join: %v", err)
	}
	if out.Token == "" || out.Label == "" {
		t.Fatal("want token and label")
	}
	sess, err := svc.Verify(out.Token)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if sess.Label != out.Label {
		t.Fatal("label mismatch")
	}
}

func TestJoinWrongCode(t *testing.T) {
	svc := newTestService(t, "TEST12", 30*time.Hour)
	if _, err := svc.EnsureSeeded(context.Background()); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Join(context.Background(), "wrong1"); err != ErrInvalidCode {
		t.Fatalf("want ErrInvalidCode, got %v", err)
	}
}

func TestRotateKeepsSessions(t *testing.T) {
	svc := newTestService(t, "TEST12", 30*time.Hour)
	ctx := context.Background()
	if _, err := svc.EnsureSeeded(ctx); err != nil {
		t.Fatal(err)
	}
	out, err := svc.Join(ctx, "test12")
	if err != nil {
		t.Fatal(err)
	}
	code, err := svc.Rotate(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Join(ctx, "test12"); err != ErrInvalidCode {
		t.Fatal("old code must die")
	}
	if _, err := svc.Join(ctx, code); err != nil {
		t.Fatalf("new code must work: %v", err)
	}
	if _, err := svc.Verify(out.Token); err != nil {
		t.Fatalf("old session must survive rotate: %v", err)
	}
}

func TestRevokeKillsSession(t *testing.T) {
	svc := newTestService(t, "TEST12", 30*time.Hour)
	ctx := context.Background()
	if _, err := svc.EnsureSeeded(ctx); err != nil {
		t.Fatal(err)
	}
	out, err := svc.Join(ctx, "test12")
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.Revoke(ctx, out.SessionID); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Verify(out.Token); err != ErrInvalidToken {
		t.Fatalf("want ErrInvalidToken, got %v", err)
	}
}

func TestExpiredPurged(t *testing.T) {
	svc := newTestService(t, "TEST12", -1*time.Hour)
	ctx := context.Background()
	if _, err := svc.EnsureSeeded(ctx); err != nil {
		t.Fatal(err)
	}
	out, err := svc.Join(ctx, "TEST12")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Verify(out.Token); err != ErrExpired {
		t.Fatalf("want ErrExpired, got %v", err)
	}
	if n, err := svc.PurgeExpired(ctx); err != nil || n != 1 {
		t.Fatalf("want 1 purged, got %d (%v)", n, err)
	}
}

func TestSeedGeneratesCodeWhenEmpty(t *testing.T) {
	svc := newTestService(t, "", 30*time.Hour)
	fresh, err := svc.EnsureSeeded(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if fresh == "" {
		t.Fatal("want generated code on first seed")
	}
	if _, err := svc.Join(context.Background(), fresh); err != nil {
		t.Fatalf("generated code must work: %v", err)
	}
	if again, err := svc.EnsureSeeded(context.Background()); err != nil || again != "" {
		t.Fatalf("reseed must be a no-op, got %q (%v)", again, err)
	}
}

func TestRateLimiter(t *testing.T) {
	limiter := NewRateLimiter(3, time.Minute)
	ip := "192.168.1.10"
	for i := 0; i < 3; i++ {
		if !limiter.Allow(ip) {
			t.Fatalf("attempt %d must pass", i+1)
		}
	}
	if limiter.Allow(ip) {
		t.Fatal("4th attempt must be limited")
	}
	if !limiter.Allow("192.168.1.11") {
		t.Fatal("other IP must pass")
	}
}
