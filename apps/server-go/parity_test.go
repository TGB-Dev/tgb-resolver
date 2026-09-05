package main

import (
	"encoding/json"
	"os"
	"testing"

	"tgb-resolver/server-go/features/show"
)

func normalizeJSON(t *testing.T, data []byte) map[string]any {
	t.Helper()
	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatal(err)
	}
	return stripNulls(raw).(map[string]any)
}

func stripNulls(v any) any {
	switch value := v.(type) {
	case map[string]any:
		out := map[string]any{}
		for key, item := range value {
			if key == "$schema" || item == nil {
				continue
			}
			out[key] = stripNulls(item)
		}
		return out
	case []any:
		out := make([]any, 0, len(value))
		for _, item := range value {
			out = append(out, stripNulls(item))
		}
		return out
	default:
		return v
	}
}

func TestGoldenImportMatchesDotnet(t *testing.T) {
	xml, err := os.ReadFile("testdata/parity.xml")
	if err != nil {
		t.Fatal(err)
	}
	expectedRaw, err := os.ReadFile("testdata/dotnet-import.json")
	if err != nil {
		t.Fatal(err)
	}
	expected := normalizeJSON(t, expectedRaw)

	actual := show.BuildShowFromXML(xml, nil, 999)
	encoded, err := json.Marshal(actual)
	if err != nil {
		t.Fatal(err)
	}
	got := normalizeJSON(t, encoded)
	delete(got, "showVersion")
	delete(got, "meta")
	delete(expected, "showVersion")
	delete(expected, "meta")

	expectedJSON, _ := json.Marshal(expected)
	actualJSON, _ := json.Marshal(got)
	if string(expectedJSON) != string(actualJSON) {
		t.Fatal("go import diverges from dotnet golden snapshot")
	}
}
