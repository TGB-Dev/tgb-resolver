package importing

import (
	"encoding/xml"
	"fmt"
	"math"
	"os"
	"strconv"
	"strings"

	"tgb-resolver/server-go/features/shared/domain"
)

type rawContest struct {
	XMLName  xml.Name     `xml:"contest"`
	Info     rawInfo      `xml:"info"`
	Problems []rawProblem `xml:"problem"`
	Teams    []rawTeam    `xml:"team"`
	Runs     []rawRun     `xml:"run"`
}

type rawInfo struct {
	ContestID              string `xml:"contest-id"`
	Title                  string `xml:"title"`
	StartTime              string `xml:"starttime"`
	Length                 string `xml:"length"`
	Penalty                string `xml:"penalty"`
	ScoreboardFreezeLength string `xml:"scoreboard-freeze-length"`
}

type rawProblem struct {
	ID    string `xml:"id"`
	Label string `xml:"label"`
	Name  string `xml:"name"`
	Score string `xml:"score"`
}

type rawTeam struct {
	ID       string `xml:"id"`
	Name     string `xml:"name"`
	Username string `xml:"username"`
}

type rawRun struct {
	ID      string `xml:"id"`
	Problem string `xml:"problem"`
	Team    string `xml:"team"`
	Time    string `xml:"time"`
	Solved  string `xml:"solved"`
	Penalty string `xml:"penalty"`
	Score   string `xml:"score"`
	Result  string `xml:"result"`
}

type Info struct {
	ContestID              string
	Title                  string
	StartTime              int
	Length                 string
	Penalty                int
	ScoreboardFreezeLength string
}

type Problem struct {
	ID    int
	Label string
	Name  string
	Score float64
}

type Team struct {
	ID       int
	Name     string
	Username string
}

type Run struct {
	ID                          int
	Problem                     int
	Team                        int
	Time                        float64
	Solved                      string
	Penalized                   bool
	Score                       float64
	Verdict                     domain.VerdictRunResult
	SubmissionSecondsSinceStart float64
}

type Contest struct {
	Info     Info
	Problems []Problem
	Teams    []Team
	Runs     []Run
}

func ParseFile(path string) (*Contest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	return Parse(data)
}

func Parse(data []byte) (*Contest, error) {
	var raw rawContest
	dec := xml.NewDecoder(strings.NewReader(string(data)))
	dec.Strict = true
	if err := dec.Decode(&raw); err != nil {
		return nil, fmt.Errorf("failed to parse XML: %w", err)
	}
	if raw.XMLName.Local != "contest" {
		return nil, fmt.Errorf("failed to parse XML: missing or invalid <contest> root element")
	}

	info, err := parseInfo(raw.Info)
	if err != nil {
		return nil, err
	}
	problems := make([]Problem, 0, len(raw.Problems))
	for _, p := range raw.Problems {
		parsed, err := parseProblem(p)
		if err != nil {
			return nil, err
		}
		problems = append(problems, parsed)
	}
	teams := make([]Team, 0, len(raw.Teams))
	for _, tm := range raw.Teams {
		parsed, err := parseTeam(tm)
		if err != nil {
			return nil, err
		}
		teams = append(teams, parsed)
	}
	runs := make([]Run, 0, len(raw.Runs))
	for _, r := range raw.Runs {
		parsed, err := parseRun(r)
		if err != nil {
			return nil, err
		}
		runs = append(runs, parsed)
	}
	if err := validateRunIDsMonotonic(runs); err != nil {
		return nil, err
	}
	return &Contest{Info: info, Problems: problems, Teams: teams, Runs: runs}, nil
}

func validateRunIDsMonotonic(runs []Run) error {
	type key struct{ team, problem int }
	type val struct {
		time  float64
		runID int
	}
	latest := map[key]val{}
	for _, run := range runs {
		k := key{run.Team, run.Problem}
		prev, ok := latest[k]
		if !ok {
			latest[k] = val{run.SubmissionSecondsSinceStart, run.ID}
			continue
		}
		if run.SubmissionSecondsSinceStart >= prev.time && run.ID < prev.runID {
			return fmt.Errorf("run #%d for team %d, problem %d is later in time than run #%d but has a smaller id. Penalty calculation assumes run ids are monotonic in time", run.ID, run.Team, run.Problem, prev.runID)
		}
		if run.SubmissionSecondsSinceStart >= prev.time {
			latest[k] = val{run.SubmissionSecondsSinceStart, run.ID}
		}
	}
	return nil
}

func parseInfo(raw rawInfo) (Info, error) {
	startTime, err := getFloat(raw.StartTime, "starttime", nil)
	if err != nil {
		return Info{}, err
	}
	penalty, err := getFloat(raw.Penalty, "penalty", nil)
	if err != nil {
		return Info{}, err
	}
	return Info{
		ContestID:              strings.TrimSpace(raw.ContestID),
		Title:                  strings.TrimSpace(raw.Title),
		StartTime:              int(math.Trunc(startTime)),
		Length:                 strings.TrimSpace(raw.Length),
		Penalty:                int(math.Trunc(penalty)),
		ScoreboardFreezeLength: strings.TrimSpace(raw.ScoreboardFreezeLength),
	}, nil
}

func parseProblem(raw rawProblem) (Problem, error) {
	id, err := getFloat(raw.ID, "id", nil)
	if err != nil {
		return Problem{}, err
	}
	score, err := getFloat(raw.Score, "score", ptr(100.0))
	if err != nil {
		return Problem{}, err
	}
	return Problem{ID: int(math.Trunc(id)), Label: strings.TrimSpace(raw.Label), Name: strings.TrimSpace(raw.Name), Score: score}, nil
}

func parseTeam(raw rawTeam) (Team, error) {
	id, err := getFloat(raw.ID, "id", nil)
	if err != nil {
		return Team{}, err
	}
	return Team{ID: int(math.Trunc(id)), Name: strings.TrimSpace(raw.Name), Username: strings.TrimSpace(raw.Username)}, nil
}

func parseRun(raw rawRun) (Run, error) {
	id, err := getFloat(raw.ID, "id", nil)
	if err != nil {
		return Run{}, err
	}
	problem, err := getFloat(raw.Problem, "problem", nil)
	if err != nil {
		return Run{}, err
	}
	team, err := getFloat(raw.Team, "team", nil)
	if err != nil {
		return Run{}, err
	}
	time, err := getFloat(raw.Time, "time", nil)
	if err != nil {
		return Run{}, err
	}
	score, err := getFloat(raw.Score, "score", ptr(0.0))
	if err != nil {
		return Run{}, err
	}
	return Run{
		ID:                          int(math.Trunc(id)),
		Problem:                     int(math.Trunc(problem)),
		Team:                        int(math.Trunc(team)),
		Time:                        math.Floor(time),
		Solved:                      strings.TrimSpace(raw.Solved),
		Penalized:                   strings.EqualFold(strings.TrimSpace(raw.Penalty), "true"),
		Score:                       score,
		Verdict:                     parseVerdict(raw.Result),
		SubmissionSecondsSinceStart: time,
	}, nil
}

func parseVerdict(result string) domain.VerdictRunResult {
	switch strings.ToUpper(strings.TrimSpace(result)) {
	case "AC":
		return domain.VerdictAccepted
	case "WA":
		return domain.VerdictWrongAnswer
	case "TLE":
		return domain.VerdictTimeLimitExceeded
	case "MLE":
		return domain.VerdictMemoryLimitExceeded
	case "OLE":
		return domain.VerdictOutputLimitExceeded
	case "IR":
		return domain.VerdictInvalidReturn
	case "RTE":
		return domain.VerdictRuntimeError
	case "CE":
		return domain.VerdictCompileError
	case "IE":
		return domain.VerdictInternalError
	case "SC":
		return domain.VerdictShortCircuited
	case "AB":
		return domain.VerdictAborted
	default:
		return domain.VerdictUnknown
	}
}

func getFloat(value, name string, def *float64) (float64, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		if def != nil {
			return *def, nil
		}
		return 0, fmt.Errorf("missing <%s> element", name)
	}
	parsed, err := strconv.ParseFloat(trimmed, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid numeric value for <%s>: %s", name, trimmed)
	}
	return parsed, nil
}

func ptr(v float64) *float64 { return &v }
