package importing

import (
	"math"
	"testing"

	"tgb-resolver/server-go/features/shared/domain"
)

type expectedTeam struct {
	username string
	score    float64
	rank     int
}

type expectedResolveEvent struct {
	userID    int
	problemID int
	newScore  float64
	newRank   int
	verdict   domain.VerdictRunResult
}

var expectedFrozenBoard = []expectedTeam{
	{"CONTEST_5", 550, 1}, {"CONTEST_15", 437.5, 2},
	{"CONTEST_35", 427.5, 3}, {"CONTEST_4", 401.25, 4},
	{"CONTEST_27", 385, 5}, {"CONTEST_44", 350, 6},
	{"CONTEST_43", 321.25, 7}, {"CONTEST_49", 313.75, 8},
	{"CONTEST_25", 278.75, 9}, {"CONTEST_54", 268.75, 10},
	{"CONTEST_34", 235, 11}, {"CONTEST_52", 235, 12},
	{"CONTEST_22", 227.5, 13}, {"CONTEST_31", 226.25, 14},
	{"CONTEST_7", 226.25, 15}, {"CONTEST_53", 220, 16},
	{"CONTEST_14", 216.25, 17}, {"CONTEST_28", 208.75, 18},
	{"CONTEST_50", 200, 19}, {"CONTEST_36", 181.25, 20},
	{"CONTEST_12", 175, 21}, {"CONTEST_48", 167.5, 22},
	{"CONTEST_26", 156.25, 23}, {"CONTEST_21", 145, 24},
	{"CONTEST_18", 145, 25}, {"CONTEST_8", 145, 26},
	{"CONTEST_47", 126.25, 27}, {"CONTEST_39", 126.25, 28},
	{"CONTEST_40", 126.25, 29}, {"CONTEST_30", 126.25, 30},
	{"CONTEST_51", 118.75, 31}, {"CONTEST_37", 118.75, 32},
	{"CONTEST_13", 118.75, 33}, {"CONTEST_19", 118.75, 34},
	{"CONTEST_38", 118.75, 35}, {"CONTEST_33", 118.75, 36},
	{"CONTEST_6", 118.75, 37}, {"CONTEST_45", 118.75, 38},
	{"CONTEST_23", 100, 39}, {"CONTEST_11", 100, 40},
	{"CONTEST_41", 100, 41}, {"CONTEST_9", 100, 42},
	{"CONTEST_2", 100, 43}, {"CONTEST_3", 100, 44},
	{"CONTEST_10", 100, 45}, {"CONTEST_29", 100, 46},
	{"CONTEST_17", 100, 47}, {"CONTEST_16", 58, 48},
	{"CONTEST_32", 41, 49}, {"CONTEST_20", 21, 50},
	{"CONTEST_46", 18, 51}, {"CONTEST_24", 1, 52},
	{"CONTEST_42", 0, 53},
}

var expectedResolveEvents = []expectedResolveEvent{
	{42, 6, 0, 53, domain.VerdictWrongAnswer},
	{24, 0, 1, 52, domain.VerdictUnknown},
	{46, 1, 32, 50, domain.VerdictTimeLimitExceeded},
	{20, 2, 21, 51, domain.VerdictWrongAnswer},
	{32, 6, 41, 49, domain.VerdictWrongAnswer},
	{16, 0, 58, 48, domain.VerdictUnknown},
	{17, 6, 100, 47, domain.VerdictWrongAnswer},
	{29, 0, 100, 46, domain.VerdictUnknown},
	{10, 0, 100, 45, domain.VerdictUnknown},
	{3, 6, 100, 44, domain.VerdictWrongAnswer},
	{2, 0, 100, 43, domain.VerdictUnknown},
	{9, 2, 118.75, 39, domain.VerdictWrongAnswer},
	{41, 0, 100, 42, domain.VerdictUnknown},
	{11, 3, 100, 41, domain.VerdictTimeLimitExceeded},
	{23, 2, 118.75, 40, domain.VerdictTimeLimitExceeded},
	{23, 6, 118.75, 40, domain.VerdictWrongAnswer},
	{9, 4, 118.75, 39, domain.VerdictTimeLimitExceeded},
	{45, 6, 118.75, 38, domain.VerdictWrongAnswer},
	{6, 6, 118.75, 37, domain.VerdictWrongAnswer},
	{33, 6, 118.75, 36, domain.VerdictWrongAnswer},
	{38, 6, 118.75, 35, domain.VerdictWrongAnswer},
	{19, 0, 118.75, 34, domain.VerdictUnknown},
	{13, 3, 118.75, 33, domain.VerdictRuntimeError},
	{37, 0, 118.75, 32, domain.VerdictUnknown},
	{51, 0, 118.75, 31, domain.VerdictUnknown},
	{30, 3, 126.25, 30, domain.VerdictRuntimeError},
	{40, 3, 126.25, 29, domain.VerdictTimeLimitExceeded},
	{39, 6, 126.25, 28, domain.VerdictWrongAnswer},
	{47, 0, 126.25, 27, domain.VerdictUnknown},
	{8, 6, 145, 26, domain.VerdictWrongAnswer},
	{18, 3, 145, 25, domain.VerdictTimeLimitExceeded},
	{18, 6, 145, 25, domain.VerdictWrongAnswer},
	{21, 3, 145, 24, domain.VerdictTimeLimitExceeded},
	{26, 2, 156.25, 23, domain.VerdictWrongAnswer},
	{26, 3, 216.25, 18, domain.VerdictTimeLimitExceeded},
	{48, 0, 167.5, 23, domain.VerdictUnknown},
	{12, 6, 175, 22, domain.VerdictWrongAnswer},
	{36, 0, 181.25, 21, domain.VerdictUnknown},
	{50, 3, 200, 20, domain.VerdictTimeLimitExceeded},
	{28, 4, 208.75, 19, domain.VerdictWrongAnswer},
	{26, 6, 216.25, 18, domain.VerdictWrongAnswer},
	{14, 6, 216.25, 17, domain.VerdictWrongAnswer},
	{53, 4, 255, 11, domain.VerdictTimeLimitExceeded},
	{7, 3, 226.25, 16, domain.VerdictTimeLimitExceeded},
	{7, 6, 226.25, 16, domain.VerdictWrongAnswer},
	{31, 0, 226.25, 15, domain.VerdictUnknown},
	{22, 3, 227.5, 14, domain.VerdictWrongAnswer},
	{52, 4, 235, 13, domain.VerdictTimeLimitExceeded},
	{34, 6, 235, 12, domain.VerdictWrongAnswer},
	{54, 2, 268.75, 10, domain.VerdictWrongAnswer},
	{25, 2, 278.75, 9, domain.VerdictTimeLimitExceeded},
	{49, 2, 313.75, 8, domain.VerdictTimeLimitExceeded},
	{43, 2, 321.25, 7, domain.VerdictWrongAnswer},
	{43, 4, 321.25, 7, domain.VerdictWrongAnswer},
	{44, 4, 350, 6, domain.VerdictWrongAnswer},
	{44, 6, 350, 6, domain.VerdictWrongAnswer},
	{27, 4, 437.5, 3, domain.VerdictTimeLimitExceeded},
	{4, 4, 427.5, 5, domain.VerdictRuntimeError},
	{35, 4, 506.25, 2, domain.VerdictAccepted},
	{15, 4, 437.5, 3, domain.VerdictWrongAnswer},
	{5, 0, 550, 1, domain.VerdictUnknown},
}

func userIDFor(username string) int {
	id := 0
	for _, c := range username[len("CONTEST_"):] {
		id = id*10 + int(c-'0')
	}
	return id
}

func keepTeams(contest *Contest, ids ...int) {
	keep := map[int]bool{}
	for _, id := range ids {
		keep[id] = true
	}
	teams := contest.Teams[:0]
	for _, tm := range contest.Teams {
		if keep[tm.ID] {
			teams = append(teams, tm)
		}
	}
	contest.Teams = teams
}

func keepProblems(contest *Contest, ids ...int) {
	keep := map[int]bool{}
	for _, id := range ids {
		keep[id] = true
	}
	problems := contest.Problems[:0]
	for _, p := range contest.Problems {
		if keep[p.ID] {
			problems = append(problems, p)
		}
	}
	contest.Problems = problems
}

func keepRuns(contest *Contest, ids ...int) {
	keep := map[int]bool{}
	for _, id := range ids {
		keep[id] = true
	}
	runs := contest.Runs[:0]
	for _, r := range contest.Runs {
		if keep[r.ID] {
			runs = append(runs, r)
		}
	}
	contest.Runs = runs
}

func runByID(contest *Contest, id int) *Run {
	for i := range contest.Runs {
		if contest.Runs[i].ID == id {
			return &contest.Runs[i]
		}
	}
	return nil
}

func convertSample(t *testing.T, contest *Contest, excluded []string) *Resolution {
	t.Helper()
	res, err := Convert(marshalContest(t, contest), excluded)
	if err != nil {
		t.Fatal(err)
	}
	return res
}

func entryFor(t *testing.T, entries []domain.FreezeSnapshotEntry, userID int) domain.FreezeSnapshotEntry {
	t.Helper()
	for _, e := range entries {
		if e.UserID == userID {
			return e
		}
	}
	t.Fatalf("no freeze entry for user %d", userID)
	return domain.FreezeSnapshotEntry{}
}

func TestConvertSample_MatchesVnoiBoardAndRevealSequence(t *testing.T) {
	res, err := Convert(loadSampleBytes(t), []string{"CONTEST_1"})
	if err != nil {
		t.Fatal(err)
	}
	if len(res.PreFreezeSnapshot) != len(expectedFrozenBoard) {
		t.Fatalf("want %d freeze entries got %d", len(expectedFrozenBoard), len(res.PreFreezeSnapshot))
	}
	for _, want := range expectedFrozenBoard {
		got := entryFor(t, res.PreFreezeSnapshot, userIDFor(want.username))
		if math.Abs(got.TotalScore-want.score) > 1e-9 {
			t.Fatalf("team %s: want score %v got %v", want.username, want.score, got.TotalScore)
		}
		if got.Rank != want.rank {
			t.Fatalf("team %s: want rank %d got %d", want.username, want.rank, got.Rank)
		}
	}
	team5 := entryFor(t, res.PreFreezeSnapshot, 5)
	if len(team5.Problems) == 0 || team5.Problems[0].PreFreezeSubmissionCount <= 0 {
		t.Fatal("want team 5 problem 1 pre-freeze submissions")
	}
	if team5.Problems[0].PostFreezeSubmissionCount != 0 {
		t.Fatal("want team 5 problem 1 zero post-freeze submissions")
	}
	team42 := entryFor(t, res.PreFreezeSnapshot, 42)
	var prob6 *domain.ProblemFreezeResult
	for i := range team42.Problems {
		if team42.Problems[i].ProblemID == 6 {
			prob6 = &team42.Problems[i]
		}
	}
	if prob6 == nil || prob6.PreFreezeSubmissionCount != 2 || prob6.PostFreezeSubmissionCount != 3 {
		t.Fatalf("want team 42 problem 6 counts 2/3 got %+v", prob6)
	}

	if len(res.ResolveEvents) != len(expectedResolveEvents) {
		t.Fatalf("want %d events got %d", len(expectedResolveEvents), len(res.ResolveEvents))
	}
	for i, want := range expectedResolveEvents {
		got := res.ResolveEvents[i]
		if got.UserID != want.userID || got.ProblemID != want.problemID ||
			math.Abs(got.NewTotalScore-want.newScore) > 1e-9 ||
			got.NewRank != want.newRank || got.Verdict != want.verdict {
			t.Fatalf("event %d: want %+v got %+v", i, want, got)
		}
	}
}

func TestConvertSample_WrongAttemptPenalty(t *testing.T) {
	contest := loadSample(t)
	contest.Info.Penalty = 1
	keepTeams(contest, 5, 15)
	keepProblems(contest, 1)
	keepRuns(contest, 3717, 3710, 3714)
	contest.Info.ScoreboardFreezeLength = "0:00:00"
	res := convertSample(t, contest, nil)
	if got := entryFor(t, res.PreFreezeSnapshot, 15).TotalPenalty; got != 238 {
		t.Fatalf("want team 15 penalty 238 got %v", got)
	}
	if got := entryFor(t, res.PreFreezeSnapshot, 5).TotalPenalty; got != 186 {
		t.Fatalf("want team 5 penalty 186 got %v", got)
	}
}

func TestConvertSample_EmptyInput(t *testing.T) {
	contest := loadSample(t)
	contest.Teams = nil
	contest.Problems = nil
	contest.Runs = nil
	res := convertSample(t, contest, nil)
	if res.DurationSeconds != 11100 {
		t.Fatalf("want duration 11100 got %d", res.DurationSeconds)
	}
	if len(res.Problems) != 0 || len(res.Users) != 0 || len(res.PreFreezeSnapshot) != 0 || len(res.ResolveEvents) != 0 {
		t.Fatal("want empty resolution")
	}
}

func TestConvertSample_ZeroFreezeLeavesNothingPending(t *testing.T) {
	contest := loadSample(t)
	contest.Info.ScoreboardFreezeLength = "0:00:00"
	res := convertSample(t, contest, nil)
	if len(res.ResolveEvents) != 54 {
		t.Fatalf("want 54 finalize events got %d", len(res.ResolveEvents))
	}
	for _, e := range res.ResolveEvents {
		if !e.IsFinalize || e.ProblemID != 0 {
			t.Fatalf("want finalize-only events got %+v", e)
		}
	}
	if len(res.PreFreezeSnapshot) != 54 {
		t.Fatalf("want 54 freeze entries got %d", len(res.PreFreezeSnapshot))
	}
}

func TestConvertSample_ResolveEventsCarryPenaltyAndTiming(t *testing.T) {
	contest := loadSample(t)
	contest.Info.Penalty = 1
	keepTeams(contest, 5, 15)
	keepProblems(contest, 1)
	keepRuns(contest, 3717, 3710, 3714)
	contest.Info.Length = "0:05:00"
	contest.Info.ScoreboardFreezeLength = "0:03:00"
	res := convertSample(t, contest, nil)
	if len(res.ResolveEvents) != 2 {
		t.Fatalf("want 2 events got %d", len(res.ResolveEvents))
	}
	first := res.ResolveEvents[0]
	if first.UserID != 15 || first.ProblemID != 1 || first.NewTotalScore != 100 ||
		first.NewTotalPenalty != 238 || first.NewRank != 1 || first.NewProblemScore != 100 ||
		first.Verdict != domain.VerdictAccepted || first.TimeSinceStart != 178 {
		t.Fatalf("bad first event: %+v", first)
	}
	second := res.ResolveEvents[1]
	if second.UserID != 5 || second.NewTotalScore != 100 || second.NewTotalPenalty != 186 ||
		second.NewRank != 1 || second.NewProblemScore != 100 ||
		second.Verdict != domain.VerdictAccepted || second.TimeSinceStart != 186 {
		t.Fatalf("bad second event: %+v", second)
	}
}

func TestConvertSample_TiedTeamsShareRank(t *testing.T) {
	contest := loadSample(t)
	keepTeams(contest, 5, 15, 42)
	keepProblems(contest, 1)
	keepRuns(contest, 3717, 3714)
	runByID(contest, 3714).SubmissionSecondsSinceStart = 186.084502
	runByID(contest, 3714).Time = 186
	contest.Info.ScoreboardFreezeLength = "0:00:00"
	res := convertSample(t, contest, nil)
	if got := entryFor(t, res.PreFreezeSnapshot, 5).Rank; got != 1 {
		t.Fatalf("want team 5 rank 1 got %d", got)
	}
	if got := entryFor(t, res.PreFreezeSnapshot, 15).Rank; got != 1 {
		t.Fatalf("want team 15 rank 1 got %d", got)
	}
	if got := entryFor(t, res.PreFreezeSnapshot, 42).Rank; got != 3 {
		t.Fatalf("want team 42 rank 3 got %d", got)
	}
}

func TestConvertSample_ExcludesUsernames(t *testing.T) {
	res, err := Convert(loadSampleBytes(t), []string{"CONTEST_1", "CONTEST_5"})
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Users) != 52 {
		t.Fatalf("want 52 users got %d", len(res.Users))
	}
	for _, e := range res.PreFreezeSnapshot {
		if e.UserID == 1 || e.UserID == 5 {
			t.Fatalf("excluded user %d in snapshot", e.UserID)
		}
	}
	for _, e := range res.ResolveEvents {
		if e.UserID == 1 || e.UserID == 5 {
			t.Fatalf("excluded user %d in events", e.UserID)
		}
	}
}

func appendPostFreezeRun(contest *Contest, score float64, solved bool, penalized bool, result domain.VerdictRunResult) {
	solvedText := "false"
	if solved {
		solvedText = "true"
	}
	contest.Runs = append(contest.Runs, Run{
		ID: 9999, Problem: 1, Team: 5, Time: 10500,
		Solved: solvedText, Penalized: penalized, Score: score, Verdict: result,
		SubmissionSecondsSinceStart: 10500,
	})
}

func TestConvertSample_NonImprovingPostFreeze_IsStillPending(t *testing.T) {
	contest := loadSample(t)
	keepTeams(contest, 5)
	keepProblems(contest, 1)
	keepRuns(contest, 3717)
	appendPostFreezeRun(contest, 0, false, true, domain.VerdictWrongAnswer)
	contest.Info.ScoreboardFreezeLength = "0:15:00"
	res := convertSample(t, contest, nil)
	var resolve *ResolveEvent
	for i := range res.ResolveEvents {
		if e := &res.ResolveEvents[i]; e.UserID == 5 && !e.IsFinalize {
			resolve = e
		}
	}
	if resolve == nil {
		t.Fatal("want pending resolve for team 5")
	}
	if resolve.ProblemID != 1 || resolve.Verdict != domain.VerdictWrongAnswer || resolve.NewTotalScore != 100 {
		t.Fatalf("bad resolve: %+v", resolve)
	}
	frozen := entryFor(t, res.PreFreezeSnapshot, 5)
	if frozen.TotalScore != 100 {
		t.Fatalf("want frozen 100 got %v", frozen.TotalScore)
	}
	var problem *domain.ProblemFreezeResult
	for i := range frozen.Problems {
		if frozen.Problems[i].ProblemID == 1 {
			problem = &frozen.Problems[i]
		}
	}
	if problem == nil || problem.Verdict != domain.VerdictUnresolved ||
		problem.PreFreezeSubmissionCount != 1 || problem.PostFreezeSubmissionCount != 1 {
		t.Fatalf("bad freeze problem: %+v", problem)
	}
}

func TestConvertSample_LowerPartialPostFreeze_KeepsScore(t *testing.T) {
	contest := loadSample(t)
	keepTeams(contest, 5)
	keepProblems(contest, 1)
	keepRuns(contest, 3717)
	pre := runByID(contest, 3717)
	if pre == nil {
		t.Fatal("want run 3717")
	}
	pre.Score = 75
	pre.Solved = "false"
	pre.Verdict = domain.VerdictWrongAnswer
	appendPostFreezeRun(contest, 25, false, true, domain.VerdictWrongAnswer)
	contest.Info.ScoreboardFreezeLength = "0:15:00"
	res := convertSample(t, contest, nil)
	var resolve *ResolveEvent
	for i := range res.ResolveEvents {
		if e := &res.ResolveEvents[i]; e.UserID == 5 && !e.IsFinalize {
			resolve = e
		}
	}
	if resolve == nil {
		t.Fatal("want pending resolve for team 5")
	}
	if resolve.NewTotalScore != 75 || resolve.NewProblemScore != 75 {
		t.Fatalf("want score kept at 75 got %+v", resolve)
	}
}

func TestConvertSample_FullySolvedResubmit_PenaltyUnchanged(t *testing.T) {
	contest := loadSample(t)
	keepTeams(contest, 5)
	keepProblems(contest, 1)
	keepRuns(contest, 3717)
	appendPostFreezeRun(contest, 100, true, false, domain.VerdictAccepted)
	contest.Info.ScoreboardFreezeLength = "0:15:00"
	res := convertSample(t, contest, nil)
	var resolve *ResolveEvent
	for i := range res.ResolveEvents {
		if e := &res.ResolveEvents[i]; e.UserID == 5 && !e.IsFinalize {
			resolve = e
		}
	}
	if resolve == nil {
		t.Fatal("want pending resolve for team 5")
	}
	if resolve.NewTotalScore != 100 {
		t.Fatalf("want 100 got %+v", resolve)
	}
	frozen := entryFor(t, res.PreFreezeSnapshot, 5)
	if resolve.NewTotalPenalty != frozen.TotalPenalty {
		t.Fatalf("want penalty %v got %v", frozen.TotalPenalty, resolve.NewTotalPenalty)
	}
}

func TestConvertSample_RunAtFreezeBoundary_IsPending(t *testing.T) {
	contest := loadSample(t)
	keepTeams(contest, 5)
	keepProblems(contest, 1)
	keepRuns(contest, 3717)
	contest.Runs = append(contest.Runs, Run{
		ID: 9999, Problem: 1, Team: 5, Time: 10200,
		Solved: "false", Penalized: true, Score: 0, Verdict: domain.VerdictWrongAnswer,
		SubmissionSecondsSinceStart: 10200,
	})
	contest.Info.ScoreboardFreezeLength = "0:15:00"
	res := convertSample(t, contest, nil)
	found := false
	for _, e := range res.ResolveEvents {
		if e.UserID == 5 && e.ProblemID == 1 && !e.IsFinalize {
			found = true
		}
	}
	if !found {
		t.Fatal("want boundary run pending")
	}
	frozen := entryFor(t, res.PreFreezeSnapshot, 5)
	var problem *domain.ProblemFreezeResult
	for i := range frozen.Problems {
		if frozen.Problems[i].ProblemID == 1 {
			problem = &frozen.Problems[i]
		}
	}
	if problem == nil || problem.PostFreezeSubmissionCount != 1 {
		t.Fatalf("want post count 1 got %+v", problem)
	}
}

func TestConvertSample_DropsRunsBeyondDuration(t *testing.T) {
	contest := loadSample(t)
	contest.Info.Length = "0:02:00"
	contest.Info.ScoreboardFreezeLength = "0:00:00"
	res := convertSample(t, contest, nil)
	if res.DurationSeconds != 120 {
		t.Fatalf("want duration 120 got %d", res.DurationSeconds)
	}
	for _, e := range res.PreFreezeSnapshot {
		if e.LastSubmittedSeconds != nil && *e.LastSubmittedSeconds > 120 {
			t.Fatalf("run beyond duration in snapshot: %+v", e)
		}
	}
	for _, e := range res.ResolveEvents {
		if e.TimeSinceStart > 120 {
			t.Fatalf("run beyond duration in events: %+v", e)
		}
	}
}
