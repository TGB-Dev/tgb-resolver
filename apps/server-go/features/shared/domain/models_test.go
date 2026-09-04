package domain

import (
	"encoding/json"
	"testing"
)

func TestEnumsSerializeAsStrings(t *testing.T) {
	s := EmptyShow(ShowSourceManual)
	b, _ := json.Marshal(struct {
		Mode ShowMode `json:"mode"`
	}{Mode: s.Mode})
	if string(b) != `{"mode":"Preview"}` {
		t.Fatalf("enum must be JSON string, got %s", b)
	}
	if s.ShowVersion != 0 || len(s.Timeline) != 0 {
		t.Fatalf("bad empty show: %+v", s)
	}
}
