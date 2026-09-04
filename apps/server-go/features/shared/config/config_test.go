package config

import "testing"

func TestDefaultPort(t *testing.T) {
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Port != 5001 {
		t.Fatalf("want 5001 got %d", cfg.Port)
	}
}
