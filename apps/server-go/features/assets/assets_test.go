package assets

import (
	"bytes"
	"fmt"
	"testing"

	"github.com/zeebo/xxh3"

	"tgb-resolver/server-go/features/shared/domain"
)

func TestRejectsPathTraversalID(t *testing.T) {
	for _, bad := range []string{"../evil", "a/b", "", "a b", "é"} {
		if ValidID(bad) {
			t.Fatalf("want invalid for %q", bad)
		}
	}
	if !ValidID("abc-123_XYZ") {
		t.Fatal("want valid for abc-123_XYZ")
	}
}

func TestFileStoreRoundTrip(t *testing.T) {
	store := NewFileStore(t.TempDir())
	if err := store.Save("a1", []byte("hello")); err != nil {
		t.Fatal(err)
	}
	data, err := store.Read("a1")
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "hello" {
		t.Fatalf("want hello got %q", data)
	}
	if err := store.Delete("a1"); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Read("a1"); err == nil {
		t.Fatal("want error after delete")
	}
}

func TestBundleRoundTrip(t *testing.T) {
	dir := t.TempDir()
	store := NewFileStore(dir)
	raw := []byte("fake-png-bytes")
	if err := store.Save("img1", raw); err != nil {
		t.Fatal(err)
	}
	folder := "f1"
	state := domain.ShowState{
		ShowVersion: 3,
		Assets: domain.AssetCollection{
			Items: []domain.ShowAsset{{
				ID: "img1", FileName: "a.png", OriginalName: "a.png",
				ContentType: "image/png", SizeBytes: int64(len(raw)),
				Xxh3: fmt.Sprintf("%016X", xxh3.Hash(raw)), FolderID: &folder,
			}},
			Folders: []domain.FolderNode{{ID: "f1", Name: "F"}},
		},
	}
	packed, err := Pack(state, store)
	if err != nil {
		t.Fatal(err)
	}
	restored := NewFileStore(t.TempDir())
	unpacked, err := Unpack(packed, restored)
	if err != nil {
		t.Fatal(err)
	}
	if unpacked.ShowVersion != 3 || len(unpacked.Assets.Items) != 1 {
		t.Fatalf("bad unpack: %+v", unpacked)
	}
	data, err := restored.Read("img1")
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(data, raw) {
		t.Fatal("asset bytes changed")
	}
}

func TestUnpackRejectsHashMismatch(t *testing.T) {
	dir := t.TempDir()
	store := NewFileStore(dir)
	if err := store.Save("img1", []byte("real")); err != nil {
		t.Fatal(err)
	}
	state := domain.ShowState{
		Assets: domain.AssetCollection{
			Items: []domain.ShowAsset{{
				ID: "img1", FileName: "a.png", OriginalName: "a.png",
				ContentType: "image/png", SizeBytes: 4, Xxh3: "DEADBEEF",
			}},
		},
	}
	packed, err := Pack(state, store)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := Unpack(packed, NewFileStore(t.TempDir())); err == nil {
		t.Fatal("want hash mismatch error")
	}
}
