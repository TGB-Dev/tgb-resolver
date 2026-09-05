package assets

import (
	"fmt"
	"os"
	"path/filepath"
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
	path, err := s.pathFor(id)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(s.root, 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

func (s *FileStore) Read(id string) ([]byte, error) {
	path, err := s.pathFor(id)
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("asset does not exist: %s", id)
		}
		return nil, err
	}
	return data, nil
}

func (s *FileStore) Delete(id string) error {
	path, err := s.pathFor(id)
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
