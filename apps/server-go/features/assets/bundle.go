package assets

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/zeebo/xxh3"

	"tgb-resolver/server-go/features/shared/domain"
)

const showJSONEntry = "show.json"

const assetFolder = "assets"

type BlobReader interface {
	Read(id string) ([]byte, error)
}

type BlobWriter interface {
	Save(id string, data []byte) error
}

func Pack(state domain.ShowState, blobs BlobReader) ([]byte, error) {
	showJSON, err := json.Marshal(state)
	if err != nil {
		return nil, err
	}
	var output bytes.Buffer
	w := zip.NewWriter(&output)
	showEntry, err := w.Create(showJSONEntry)
	if err != nil {
		return nil, err
	}
	if _, err := showEntry.Write(showJSON); err != nil {
		return nil, err
	}
	for _, asset := range state.Assets.Items {
		data, err := blobs.Read(asset.ID)
		if err != nil {
			continue
		}
		category := asset.ContentType
		if i := strings.Index(category, "/"); i >= 0 {
			category = category[:i]
		}
		entry, err := w.Create(assetFolder + "/" + category + "/" + asset.ID)
		if err != nil {
			return nil, err
		}
		if _, err := entry.Write(data); err != nil {
			return nil, err
		}
	}
	if err := w.Close(); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func Unpack(bundle []byte, blobs BlobWriter) (domain.ShowState, error) {
	var state domain.ShowState
	r, err := zip.NewReader(bytes.NewReader(bundle), int64(len(bundle)))
	if err != nil {
		return state, fmt.Errorf("invalid bundle: %w", err)
	}
	var showJSON []byte
	for _, entry := range r.File {
		if entry.Name == showJSONEntry {
			rc, err := entry.Open()
			if err != nil {
				return state, err
			}
			var buf bytes.Buffer
			if _, err := buf.ReadFrom(rc); err != nil {
				_ = rc.Close()
				return state, err
			}
			_ = rc.Close()
			showJSON = buf.Bytes()
		}
	}
	if showJSON == nil {
		return state, fmt.Errorf("bundle is missing the show.json entry")
	}
	if err := json.Unmarshal(showJSON, &state); err != nil {
		return state, fmt.Errorf("bundle show.json unreadable: %w", err)
	}
	assetByID := map[string]domain.ShowAsset{}
	for _, a := range state.Assets.Items {
		assetByID[a.ID] = a
	}
	for _, entry := range r.File {
		segments := strings.Split(entry.Name, "/")
		if len(segments) != 3 || segments[0] != assetFolder || segments[2] == "" {
			continue
		}
		assetID := segments[2]
		rc, err := entry.Open()
		if err != nil {
			return state, err
		}
		var buf bytes.Buffer
		if _, err := buf.ReadFrom(rc); err != nil {
			_ = rc.Close()
			return state, err
		}
		_ = rc.Close()
		data := buf.Bytes()
		if meta, ok := assetByID[assetID]; ok {
			actual := fmt.Sprintf("%016X", xxh3.Hash(data))
			if !strings.EqualFold(actual, meta.Xxh3) {
				return state, fmt.Errorf("asset %s hash mismatch: expected %s, got %s", assetID, meta.Xxh3, actual)
			}
		}
		if err := blobs.Save(assetID, data); err != nil {
			return state, err
		}
	}
	return state, nil
}
