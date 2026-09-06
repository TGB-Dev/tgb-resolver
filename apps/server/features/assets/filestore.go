package assets

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/rs/zerolog/log"
)

type FileStore struct {
	root string
}

func NewFileStore(dataDir string) *FileStore {
	return &FileStore{root: filepath.Join(dataDir, "assets")}
}

func ValidID(id string) bool {
	if id == "" {
		return false
	}
	for _, c := range id {
		if c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '-' || c == '_' {
			continue
		}
		return false
	}
	return true
}

func (s *FileStore) pathFor(id string) (string, error) {
	if !ValidID(id) {
		return "", fmt.Errorf("asset id must contain only ASCII letters, digits, hyphens, or underscores")
	}
	return filepath.Join(s.root, id), nil
}

func (s *FileStore) Save(id string, data []byte) error {
	log.Debug().Str("id", id).Int("bytes", len(data)).Msg("FileStore Save start")
	path, err := s.pathFor(id)
	if err != nil {
		log.Warn().Err(err).Str("id", id).Msg("FileStore Save invalid id")
		return err
	}
	if err := os.MkdirAll(s.root, 0o755); err != nil {
		log.Error().Err(err).Str("id", id).Msg("FileStore Save mkdir failed")
		return err
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		log.Error().Err(err).Str("id", id).Msg("FileStore Save write failed")
		return err
	}
	log.Info().Str("id", id).Int("bytes", len(data)).Msg("FileStore Save succeeded")
	return nil
}

func (s *FileStore) Read(id string) ([]byte, error) {
	log.Debug().Str("id", id).Msg("FileStore Read start")
	path, err := s.pathFor(id)
	if err != nil {
		log.Warn().Err(err).Str("id", id).Msg("FileStore Read invalid id")
		return nil, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			log.Warn().Err(err).Str("id", id).Msg("FileStore Read not found")
			return nil, fmt.Errorf("asset does not exist: %s", id)
		}
		log.Error().Err(err).Str("id", id).Msg("FileStore Read failed")
		return nil, err
	}
	log.Debug().Str("id", id).Int("bytes", len(data)).Msg("FileStore Read succeeded")
	return data, nil
}

func (s *FileStore) Delete(id string) error {
	log.Debug().Str("id", id).Msg("FileStore Delete start")
	path, err := s.pathFor(id)
	if err != nil {
		log.Warn().Err(err).Str("id", id).Msg("FileStore Delete invalid id")
		return err
	}
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		log.Error().Err(err).Str("id", id).Msg("FileStore Delete failed")
		return err
	}
	log.Info().Str("id", id).Msg("FileStore Delete succeeded")
	return nil
}
