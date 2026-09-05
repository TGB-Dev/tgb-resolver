package show

import (
	"context"
	"database/sql"
	"fmt"
	"sync/atomic"
	"testing"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	_ "modernc.org/sqlite"

	"tgb-resolver/server/features/shared/domain"
)

var testStoreSeq atomic.Int64

func testStoreDSN() string {
	return fmt.Sprintf("file:memdb%d?mode=memory&cache=shared", testStoreSeq.Add(1))
}

func newTestStore(t *testing.T) *Store {
	t.Helper()
	sqldb, err := sql.Open("sqlite", testStoreDSN())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { sqldb.Close() })
	return NewStore(bun.NewDB(sqldb, sqlitedialect.New()))
}

func TestMutateStaleVersionFails(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	_, err := s.MutateShow(ctx, 999, func(st domain.ShowState) domain.ShowState { return st })
	if err == nil {
		t.Fatal("want version drift error")
	}
}

func TestMutateShowBumpsVersion(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	cur, err := s.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	next, err := s.MutateShow(ctx, cur.ShowVersion, func(st domain.ShowState) domain.ShowState { return st })
	if err != nil {
		t.Fatal(err)
	}
	if next.ShowVersion != cur.ShowVersion+1 {
		t.Fatalf("want version %d got %d", cur.ShowVersion+1, next.ShowVersion)
	}
}

func TestMutatePlaybackKeepsVersion(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	cur, err := s.GetState(ctx)
	if err != nil {
		t.Fatal(err)
	}
	next, err := s.MutatePlayback(ctx, func(st domain.ShowState) domain.ShowState {
		st.Playback.Status = domain.PlaybackRunning
		return st
	})
	if err != nil {
		t.Fatal(err)
	}
	if next.ShowVersion != cur.ShowVersion || next.Playback.Status != domain.PlaybackRunning {
		t.Fatalf("bad playback mutate: %+v", next.Playback)
	}
}
