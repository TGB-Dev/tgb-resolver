package assets

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/rs/zerolog/log"
	"github.com/zeebo/xxh3"

	"tgb-resolver/server/features/shared/domain"
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
	log.Debug().Int("showVersion", state.ShowVersion).Int("assets", len(state.Assets.Items)).Msg("Pack start")
	showJSON, err := json.Marshal(state)
	if err != nil {
		log.Error().Err(err).Msg("Pack marshal failed")
		return nil, err
	}
	var output bytes.Buffer
	w := zip.NewWriter(&output)
	showEntry, err := w.Create(showJSONEntry)
	if err != nil {
		log.Error().Err(err).Msg("Pack create show.json failed")
		return nil, err
	}
	if _, err := showEntry.Write(showJSON); err != nil {
		log.Error().Err(err).Msg("Pack write show.json failed")
		return nil, err
	}
	for _, asset := range state.Assets.Items {
		data, err := blobs.Read(asset.ID)
		if err != nil {
			log.Warn().Err(err).Str("assetID", asset.ID).Msg("Pack blob read skipped")
			continue
		}
		category := asset.ContentType
		if i := strings.Index(category, "/"); i >= 0 {
			category = category[:i]
		}
		entry, err := w.Create(assetFolder + "/" + category + "/" + asset.ID)
		if err != nil {
			log.Error().Err(err).Str("assetID", asset.ID).Msg("Pack create entry failed")
			return nil, err
		}
		if _, err := entry.Write(data); err != nil {
			log.Error().Err(err).Str("assetID", asset.ID).Msg("Pack write entry failed")
			return nil, err
		}
	}
	if err := w.Close(); err != nil {
		log.Error().Err(err).Msg("Pack close failed")
		return nil, err
	}
	log.Info().Int("bytes", output.Len()).Msg("Pack succeeded")
	return output.Bytes(), nil
}

func Unpack(bundle []byte, blobs BlobWriter) (domain.ShowState, error) {
	log.Debug().Int("bytes", len(bundle)).Msg("Unpack start")
	var state domain.ShowState
	r, err := zip.NewReader(bytes.NewReader(bundle), int64(len(bundle)))
	if err != nil {
		log.Warn().Err(err).Msg("Unpack invalid zip")
		return state, fmt.Errorf("invalid bundle: %w", err)
	}
	var showJSON []byte
	for _, entry := range r.File {
		if entry.Name == showJSONEntry {
			rc, err := entry.Open()
			if err != nil {
				log.Error().Err(err).Msg("Unpack open show.json failed")
				return state, err
			}
			var buf bytes.Buffer
			if _, err := buf.ReadFrom(rc); err != nil {
				_ = rc.Close()
				log.Error().Err(err).Msg("Unpack read show.json failed")
				return state, err
			}
			_ = rc.Close()
			showJSON = buf.Bytes()
		}
	}
	if showJSON == nil {
		log.Warn().Msg("Unpack missing show.json")
		return state, fmt.Errorf("bundle is missing the show.json entry")
	}
	if err := json.Unmarshal(showJSON, &state); err != nil {
		log.Warn().Err(err).Msg("Unpack show.json unreadable")
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
			log.Error().Err(err).Str("assetID", assetID).Msg("Unpack open asset failed")
			return state, err
		}
		var buf bytes.Buffer
		if _, err := buf.ReadFrom(rc); err != nil {
			_ = rc.Close()
			log.Error().Err(err).Str("assetID", assetID).Msg("Unpack read asset failed")
			return state, err
		}
		_ = rc.Close()
		data := buf.Bytes()
		if meta, ok := assetByID[assetID]; ok {
			actual := fmt.Sprintf("%016X", xxh3.Hash(data))
			if !strings.EqualFold(actual, meta.Xxh3) {
				log.Warn().Str("assetID", assetID).Str("expected", meta.Xxh3).Str("actual", actual).Msg("Unpack hash mismatch")
				return state, fmt.Errorf("asset %s hash mismatch: expected %s, got %s", assetID, meta.Xxh3, actual)
			}
		}
		if err := blobs.Save(assetID, data); err != nil {
			log.Error().Err(err).Str("assetID", assetID).Msg("Unpack blob save failed")
			return state, err
		}
	}
	log.Info().Int("showVersion", state.ShowVersion).Int("assets", len(state.Assets.Items)).Msg("Unpack succeeded")
	return state, nil
}
