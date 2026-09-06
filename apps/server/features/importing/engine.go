package importing

import (
	"math"
	"sort"
	"strconv"
	"strings"

	"github.com/rs/zerolog/log"

	"tgb-resolver/server/features/shared/domain"
)

type ResolveEvent struct {
	UserID          int
	ProblemID       int
	NewTotalScore   float64
	NewTotalPenalty float64
	NewRank         int
	NewProblemScore float64
	Verdict         domain.VerdictRunResult
	TimeSinceStart  float64
	IsFinalize      bool
}

type Resolution struct {
	Title                 string
	ContestID             string
	DurationSeconds       int
	FreezeDurationSeconds int
	Problems              []domain.ProblemDefinition
	Users                 []domain.UserDefinition
	PreFreezeSnapshot     []domain.FreezeSnapshotEntry
	ResolveEvents         []ResolveEvent
}

func Convert(data []byte, excludedUsernames []string) (*Resolution, error) {
	log.Debug().Int("bytes", len(data)).Int("excluded", len(excludedUsernames)).Msg("Convert start")
	contest, err := Parse(data)
	if err != nil {
		log.Warn().Err(err).Msg("Convert parse failed")
		return nil, err
	}
	excluded := map[string]bool{}
	for _, u := range excludedUsernames {
		excluded[u] = true
	}
	teams := make([]Team, 0, len(contest.Teams))
	for _, tm := range contest.Teams {
		if !excluded[tm.Username] {
			teams = append(teams, tm)
		}
	}
	sort.Slice(teams, func(i, j int) bool { return teams[i].ID < teams[j].ID })
	teamIDs := map[int]bool{}
	for _, tm := range teams {
		teamIDs[tm.ID] = true
	}

	durationSeconds := parseDurationSeconds(contest.Info.Length)
	freezeAtSeconds := float64(durationSeconds - parseDurationSeconds(contest.Info.ScoreboardFreezeLength))

	problemDefs := make([]domain.ProblemDefinition, 0, len(contest.Problems))
	for _, p := range contest.Problems {
		problemDefs = append(problemDefs, domain.ProblemDefinition{ID: p.ID, Label: p.Label, Name: p.Name, Score: p.Score})
	}
	problemsByID := map[int]bool{}
	for _, p := range problemDefs {
		problemsByID[p.ID] = true
	}
	users := make([]domain.UserDefinition, 0, len(teams))
	for _, tm := range teams {
		users = append(users, domain.UserDefinition{ID: tm.ID, Username: tm.Username, RealName: tm.Name})
	}
	runs := make([]Run, 0, len(contest.Runs))
	for _, r := range contest.Runs {
		if teamIDs[r.Team] && problemsByID[r.Problem] && r.Time <= float64(durationSeconds) {
			runs = append(runs, r)
		}
	}
	sort.Slice(runs, func(i, j int) bool { return runs[i].ID < runs[j].ID })

	wrongAttemptPenaltySeconds := float64(contest.Info.Penalty * 60)
	frozen := newScoreboard(teams, problemDefs, runs, wrongAttemptPenaltySeconds)
	for _, r := range runs {
		if r.Time < freezeAtSeconds {
			frozen.apply(r)
		}
	}
	final := frozen.emptyClone()
	for _, r := range runs {
		final.apply(r)
	}

	pending := createPendingProblems(frozen, final, teams, problemDefs, runs, freezeAtSeconds)
	pendingKeys := map[pendingProblem]bool{}
	for k := range pending {
		pendingKeys[k] = true
	}
	resolving := frozen.clone()
	remaining := map[int]bool{}
	for _, tm := range teams {
		remaining[tm.ID] = true
	}
	events := make([]ResolveEvent, 0, len(pending)+len(remaining))

	for len(remaining) > 0 {
		snap := resolving.snapshot()
		var team standing
		for i := len(snap) - 1; i >= 0; i-- {
			if remaining[snap[i].teamID] {
				team = snap[i]
				break
			}
		}
		var teamPending []pendingProblem
		for k := range pending {
			if k.teamID == team.teamID {
				teamPending = append(teamPending, k)
			}
		}
		sort.Slice(teamPending, func(i, j int) bool { return teamPending[i].problemID < teamPending[j].problemID })

		if len(teamPending) > 0 {
			key := teamPending[0]
			run := pending[key]
			resolving.apply(run)
			delete(pending, key)

			after := resolving.snapshotFor(team.teamID)
			problemScore := resolving.resultFor(run.Team, run.Problem).points
			events = append(events, ResolveEvent{
				UserID: run.Team, ProblemID: run.Problem,
				NewTotalScore: after.score, NewTotalPenalty: after.penalty, NewRank: after.rank,
				NewProblemScore: problemScore, Verdict: run.Verdict,
				TimeSinceStart: run.Time,
			})

			stillPending := false
			for k := range pending {
				if k.teamID == team.teamID {
					stillPending = true
					break
				}
			}
			if !stillPending {
				delete(remaining, team.teamID)
			}
		} else {
			after := resolving.snapshotFor(team.teamID)
			events = append(events, ResolveEvent{
				UserID: team.teamID, ProblemID: 0,
				NewTotalScore: after.score, NewTotalPenalty: after.penalty, NewRank: after.rank,
				NewProblemScore: 0, Verdict: domain.VerdictUnknown,
				TimeSinceStart: freezeAtSeconds, IsFinalize: true,
			})
			delete(remaining, team.teamID)
		}
	}

	preFreeze := make([]domain.FreezeSnapshotEntry, 0, len(teams))
	for _, tm := range teams {
		results := make([]domain.ProblemFreezeResult, 0, len(problemDefs))
		for _, pd := range problemDefs {
			result := frozen.resultFor(tm.ID, pd.ID)
			preCount, postCount := 0, 0
			for _, r := range runs {
				if r.Team == tm.ID && r.Problem == pd.ID {
					if r.Time < freezeAtSeconds {
						preCount++
					} else {
						postCount++
					}
				}
			}
			verdict := domain.VerdictUnknown
			if pendingKeys[pendingProblem{tm.ID, pd.ID}] {
				verdict = domain.VerdictUnresolved
			} else if result.lastAlteringRunID != nil {
				if run, ok := frozen.runByID(*result.lastAlteringRunID); ok {
					verdict = run.Verdict
				}
			}
			results = append(results, domain.ProblemFreezeResult{
				ProblemID: pd.ID, Score: result.points, Verdict: verdict,
				PreFreezeSubmissionCount: preCount, PostFreezeSubmissionCount: postCount,
			})
		}
		var lastRun *Run
		for i := range runs {
			r := &runs[i]
			if r.Team == tm.ID && r.Time < freezeAtSeconds {
				if lastRun == nil || r.Time > lastRun.Time ||
					(r.Time == lastRun.Time && r.ID > lastRun.ID) {
					lastRun = r
				}
			}
		}
		standing := frozen.snapshotFor(tm.ID)
		entry := domain.FreezeSnapshotEntry{
			UserID: tm.ID, TotalScore: standing.score, TotalPenalty: standing.penalty,
			Rank: standing.rank, Problems: results,
		}
		if lastRun != nil {
			id := lastRun.ID
			tm := lastRun.Time
			entry.LastRunID = &id
			entry.LastSubmittedSeconds = &tm
		}
		preFreeze = append(preFreeze, entry)
	}

	log.Info().Str("title", contest.Info.Title).Int("events", len(events)).Int("users", len(users)).Msg("Convert succeeded")
	return &Resolution{
		Title: contest.Info.Title, ContestID: contest.Info.ContestID,
		DurationSeconds:       durationSeconds,
		FreezeDurationSeconds: parseDurationSeconds(contest.Info.ScoreboardFreezeLength),
		Problems:              problemDefs, Users: users,
		PreFreezeSnapshot: preFreeze, ResolveEvents: events,
	}, nil
}

func createPendingProblems(frozen, final *scoreboard, teams []Team, problems []domain.ProblemDefinition, runs []Run, freezeAtSeconds float64) map[pendingProblem]Run {
	byKey := map[pendingProblem][]Run{}
	for _, r := range runs {
		k := pendingProblem{r.Team, r.Problem}
		byKey[k] = append(byKey[k], r)
	}
	for k := range byKey {
		sort.Slice(byKey[k], func(i, j int) bool { return byKey[k][i].ID < byKey[k][j].ID })
	}
	pending := map[pendingProblem]Run{}
	for _, tm := range teams {
		for _, pd := range problems {
			k := pendingProblem{tm.ID, pd.ID}
			list, ok := byKey[k]
			if !ok {
				continue
			}
			var postFreeze []Run
			for _, r := range list {
				if r.Time >= freezeAtSeconds {
					postFreeze = append(postFreeze, r)
				}
			}
			if len(postFreeze) == 0 {
				continue
			}
			frozenResult := frozen.resultFor(tm.ID, pd.ID)
			finalResult := final.resultFor(tm.ID, pd.ID)
			if finalResult.lastAlteringRunID != nil &&
				!equalRunID(frozenResult.lastAlteringRunID, finalResult.lastAlteringRunID) {
				if run, ok := final.runByID(*finalResult.lastAlteringRunID); ok {
					pending[k] = run
				}
			} else {
				pending[k] = postFreeze[len(postFreeze)-1]
			}
		}
	}
	return pending
}

func equalRunID(a, b *int) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}

func parseDurationSeconds(value string) int {
	v := strings.TrimSpace(value)
	if v == "" {
		return 0
	}
	if !strings.Contains(v, ":") {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return int(f)
		}
		return 0
	}
	parts := strings.Split(v, ":")
	total := 0.0
	mult := 1.0
	for i := len(parts) - 1; i >= 0; i-- {
		f, err := strconv.ParseFloat(strings.TrimSpace(parts[i]), 64)
		if err != nil {
			return 0
		}
		total += f * mult
		mult *= 60
	}
	return int(total)
}

type problemKey struct{ teamID, problemID int }

type pendingProblem struct{ teamID, problemID int }

type problemResult struct {
	points            float64
	lastAlteringRunID *int
}

type scoreboardTeam struct {
	teamID         int
	score          float64
	penaltySeconds float64
}

type standing struct {
	teamID  int
	score   float64
	penalty float64
	rank    int
}

type scoreboard struct {
	problems                   map[int]domain.ProblemDefinition
	teams                      map[int]Team
	results                    map[problemKey]problemResult
	runsByID                   map[int]Run
	runsByProblem              map[problemKey][]Run
	wrongAttemptPenaltySeconds float64
}

func newScoreboard(teams []Team, problems []domain.ProblemDefinition, runs []Run, penalty float64) *scoreboard {
	s := &scoreboard{
		problems:                   map[int]domain.ProblemDefinition{},
		teams:                      map[int]Team{},
		results:                    map[problemKey]problemResult{},
		runsByID:                   map[int]Run{},
		runsByProblem:              map[problemKey][]Run{},
		wrongAttemptPenaltySeconds: penalty,
	}
	for _, p := range problems {
		s.problems[p.ID] = p
	}
	for _, t := range teams {
		s.teams[t.ID] = t
	}
	for _, r := range runs {
		s.runsByID[r.ID] = r
		k := problemKey{r.Team, r.Problem}
		s.runsByProblem[k] = append(s.runsByProblem[k], r)
	}
	return s
}

func (s *scoreboard) apply(run Run) {
	k := problemKey{run.Team, run.Problem}
	current := s.resultFor(run.Team, run.Problem)
	points := math.Min(effectiveScore(s, run), s.problems[run.Problem].Score)
	if points > current.points || (points == 0 && current.points == 0) {
		id := run.ID
		best := math.Max(current.points, points)
		s.results[k] = problemResult{points: best, lastAlteringRunID: &id}
	}
}

func effectiveScore(s *scoreboard, run Run) float64 {
	if run.Score == 0 && strings.EqualFold(run.Solved, "true") {
		return s.problems[run.Problem].Score
	}
	return run.Score
}

func (s *scoreboard) clone() *scoreboard {
	c := &scoreboard{
		problems: s.problems, teams: s.teams,
		results:  map[problemKey]problemResult{},
		runsByID: s.runsByID, runsByProblem: s.runsByProblem,
		wrongAttemptPenaltySeconds: s.wrongAttemptPenaltySeconds,
	}
	for k, v := range s.results {
		c.results[k] = v
	}
	return c
}

func (s *scoreboard) emptyClone() *scoreboard {
	return &scoreboard{
		problems: s.problems, teams: s.teams,
		results:  map[problemKey]problemResult{},
		runsByID: s.runsByID, runsByProblem: s.runsByProblem,
		wrongAttemptPenaltySeconds: s.wrongAttemptPenaltySeconds,
	}
}

func (s *scoreboard) resultFor(teamID, problemID int) problemResult {
	return s.results[problemKey{teamID, problemID}]
}

func (s *scoreboard) runByID(id int) (Run, bool) {
	r, ok := s.runsByID[id]
	return r, ok
}

func (s *scoreboard) snapshot() []standing {
	ordered := make([]scoreboardTeam, 0, len(s.teams))
	for _, tm := range s.teams {
		var score float64
		for k, res := range s.results {
			if k.teamID == tm.ID {
				score += res.points
			}
		}
		ordered = append(ordered, scoreboardTeam{teamID: tm.ID, score: score, penaltySeconds: s.calculatePenalty(tm.ID)})
	}
	sort.Slice(ordered, func(i, j int) bool {
		if ordered[i].score != ordered[j].score {
			return ordered[i].score > ordered[j].score
		}
		if ordered[i].penaltySeconds != ordered[j].penaltySeconds {
			return ordered[i].penaltySeconds < ordered[j].penaltySeconds
		}
		return ordered[i].teamID < ordered[j].teamID
	})
	out := make([]standing, 0, len(ordered))
	rank := 0
	var priorScore, priorPenalty float64
	hasPrior := false
	for i, tm := range ordered {
		if !hasPrior || math.Abs(tm.score-priorScore) > 1e-9 || math.Abs(tm.penaltySeconds-priorPenalty) > 1e-9 {
			rank = i + 1
			priorScore, priorPenalty = tm.score, tm.penaltySeconds
			hasPrior = true
		}
		out = append(out, standing{teamID: tm.teamID, score: tm.score, penalty: tm.penaltySeconds, rank: rank})
	}
	return out
}

func (s *scoreboard) snapshotFor(teamID int) standing {
	for _, st := range s.snapshot() {
		if st.teamID == teamID {
			return st
		}
	}
	return standing{teamID: teamID}
}

func (s *scoreboard) calculatePenalty(teamID int) float64 {
	wrongAttempts := 0
	var finish *Run
	for k, res := range s.results {
		if k.teamID != teamID || res.lastAlteringRunID == nil || res.points == 0 {
			continue
		}
		last := s.runsByID[*res.lastAlteringRunID]
		for _, r := range s.runsByProblem[k] {
			if r.ID < *res.lastAlteringRunID {
				wrongAttempts++
			}
		}
		if finish == nil || last.Time > finish.Time ||
			(math.Abs(last.Time-finish.Time) <= 1e-9 && last.ID > finish.ID) {
			c := last
			finish = &c
		}
	}
	if finish == nil {
		return 0
	}
	return finish.Time + s.wrongAttemptPenaltySeconds*float64(wrongAttempts)
}
