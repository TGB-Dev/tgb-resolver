package importing

import (
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"tgb-resolver/server/features/shared/domain"
)

func loadSampleBytes(t *testing.T) []byte {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("testdata", "sample.xml"))
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func loadSample(t *testing.T) *Contest {
	t.Helper()
	contest, err := Parse(loadSampleBytes(t))
	if err != nil {
		t.Fatal(err)
	}
	return contest
}

func marshalContest(t *testing.T, contest *Contest) []byte {
	t.Helper()
	data, err := contest.Marshal()
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func TestParseSample_ReadsContestInfoAndCollections(t *testing.T) {
	contest, err := ParseFile(filepath.Join("testdata", "sample.xml"))
	if err != nil {
		t.Fatal(err)
	}
	if contest.Info.ContestID != "contest" {
		t.Fatalf("want contest id contest got %q", contest.Info.ContestID)
	}
	if contest.Info.Title != "Contest" {
		t.Fatalf("want title Contest got %q", contest.Info.Title)
	}
	if contest.Info.StartTime != 1723862700 {
		t.Fatalf("want start 1723862700 got %d", contest.Info.StartTime)
	}
	if contest.Info.Length != "3:05:00" {
		t.Fatalf("want length 3:05:00 got %q", contest.Info.Length)
	}
	if contest.Info.Penalty != 5 {
		t.Fatalf("want penalty 5 got %d", contest.Info.Penalty)
	}
	if contest.Info.ScoreboardFreezeLength != "0:15:00" {
		t.Fatalf("want freeze 0:15:00 got %q", contest.Info.ScoreboardFreezeLength)
	}
	if len(contest.Problems) != 6 {
		t.Fatalf("want 6 problems got %d", len(contest.Problems))
	}
	if contest.Problems[1].Score != 125 {
		t.Fatalf("want problem 2 score 125 got %v", contest.Problems[1].Score)
	}
	if contest.Problems[0].Label != "A" {
		t.Fatalf("want label A got %q", contest.Problems[0].Label)
	}
	if contest.Problems[0].Name != "Thế Giới Âm Nhạc" {
		t.Fatalf("want vietnamese name got %q", contest.Problems[0].Name)
	}
	if len(contest.Teams) != 54 {
		t.Fatalf("want 54 teams got %d", len(contest.Teams))
	}
	if len(contest.Runs) != 809 {
		t.Fatalf("want 809 runs got %d", len(contest.Runs))
	}
	if int(contest.Runs[0].Time) != 86 {
		t.Fatalf("want run 0 floor time 86 got %v", contest.Runs[0].Time)
	}
	if math.Abs(contest.Runs[0].SubmissionSecondsSinceStart-86.632682) > 1e-9 {
		t.Fatalf("want submission 86.632682 got %v", contest.Runs[0].SubmissionSecondsSinceStart)
	}
	if !contest.Runs[0].Penalized {
		t.Fatal("want run 0 penalized")
	}
	if contest.Runs[0].Verdict != domain.VerdictWrongAnswer {
		t.Fatalf("want WA got %v", contest.Runs[0].Verdict)
	}
	found := false
	for _, r := range contest.Runs {
		if math.Abs(r.Score-23) < 1e-9 {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("want a run with score 23")
	}
}

func TestParseSample_MissingTitle_Throws(t *testing.T) {
	raw := string(loadSampleBytes(t))
	raw = strings.Replace(raw, "<title>Contest</title>", "", 1)
	_, err := Parse([]byte(raw))
	if err == nil || !strings.Contains(err.Error(), "Missing <title>") {
		t.Fatalf("want missing title error got %v", err)
	}
}

func TestParseSample_InvalidStarttime_Throws(t *testing.T) {
	raw := string(loadSampleBytes(t))
	raw = strings.Replace(raw, "<starttime>1723862700.0</starttime>", "<starttime>not-a-number</starttime>", 1)
	_, err := Parse([]byte(raw))
	if err == nil || !strings.Contains(err.Error(), "Invalid numeric value for <starttime>") {
		t.Fatalf("want invalid numeric error got %v", err)
	}
}

func TestParseSample_AbsentProblemScore_DefaultsTo100(t *testing.T) {
	raw := string(loadSampleBytes(t))
	raw = strings.Replace(raw, "<name>Thế Giới Âm Nhạc</name>\n    <score>100</score>", "<name>Thế Giới Âm Nhạc</name>", 1)
	result, err := Parse([]byte(raw))
	if err != nil {
		t.Fatal(err)
	}
	if result.Problems[0].Score != 100 {
		t.Fatalf("want default 100 got %v", result.Problems[0].Score)
	}
	if result.Problems[1].Score != 125 {
		t.Fatalf("want 125 got %v", result.Problems[1].Score)
	}
}

func TestParseSample_TrimsWhitespaceAroundNames(t *testing.T) {
	raw := string(loadSampleBytes(t))
	raw = strings.Replace(raw, "<name>Thế Giới Âm Nhạc</name>", "<name>   padded name   </name>", 1)
	result, err := Parse([]byte(raw))
	if err != nil {
		t.Fatal(err)
	}
	if result.Problems[0].Name != "padded name" {
		t.Fatalf("want trimmed name got %q", result.Problems[0].Name)
	}
}

func TestParseSample_MapsEveryVerdictAcronym(t *testing.T) {
	expected := map[string]domain.VerdictRunResult{
		"AC": domain.VerdictAccepted, "WA": domain.VerdictWrongAnswer,
		"TLE": domain.VerdictTimeLimitExceeded, "MLE": domain.VerdictMemoryLimitExceeded,
		"OLE": domain.VerdictOutputLimitExceeded, "IR": domain.VerdictInvalidReturn,
		"RTE": domain.VerdictRuntimeError, "CE": domain.VerdictCompileError,
		"IE": domain.VerdictInternalError, "SC": domain.VerdictShortCircuited,
		"AB": domain.VerdictAborted,
	}
	for acronym, verdict := range expected {
		raw := string(loadSampleBytes(t))
		raw = strings.Replace(raw, "<result>WA</result>", "<result>"+acronym+"</result>", 1)
		result, err := Parse([]byte(raw))
		if err != nil {
			t.Fatal(err)
		}
		if result.Runs[0].Verdict != verdict {
			t.Fatalf("want %v for %s got %v", verdict, acronym, result.Runs[0].Verdict)
		}
	}
}

func TestParseSample_UnknownVerdict_MapsToUnknown(t *testing.T) {
	raw := string(loadSampleBytes(t))
	raw = strings.Replace(raw, "<result>WA</result>", "<result>??</result>", 1)
	result, err := Parse([]byte(raw))
	if err != nil {
		t.Fatal(err)
	}
	if result.Runs[0].Verdict != domain.VerdictUnknown {
		t.Fatalf("want unknown got %v", result.Runs[0].Verdict)
	}
}

func TestParseSample_ToleratesIgnoredBlocks(t *testing.T) {
	raw := string(loadSampleBytes(t))
	raw = strings.Replace(raw, "</contest>", "<mystery><data>1</data></mystery></contest>", 1)
	result, err := Parse([]byte(raw))
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Teams) != 54 || len(result.Problems) != 6 || len(result.Runs) != 809 {
		t.Fatalf("want 54/6/809 got %d/%d/%d", len(result.Teams), len(result.Problems), len(result.Runs))
	}
	if result.Info.ContestID != "contest" || result.Info.Penalty != 5 {
		t.Fatal("want contest id and penalty preserved")
	}
}

func TestParseSample_SwappedRunIDs_Throws(t *testing.T) {
	contest := loadSample(t)
	contest.Runs[0].ID, contest.Runs[1].ID = contest.Runs[1].ID, contest.Runs[0].ID
	_, err := Parse(marshalContest(t, contest))
	if err == nil || !strings.Contains(err.Error(), "monotonic in time") {
		t.Fatalf("want monotonicity error got %v", err)
	}
}

func TestParseSample_EqualTimeDescendingIDs_Throws(t *testing.T) {
	contest := loadSample(t)
	contest.Runs[1].SubmissionSecondsSinceStart = contest.Runs[0].SubmissionSecondsSinceStart
	contest.Runs[1].Time = contest.Runs[0].Time
	contest.Runs[0].ID, contest.Runs[1].ID = contest.Runs[1].ID, contest.Runs[0].ID
	_, err := Parse(marshalContest(t, contest))
	if err == nil || !strings.Contains(err.Error(), "monotonic in time") {
		t.Fatalf("want monotonicity error got %v", err)
	}
}
