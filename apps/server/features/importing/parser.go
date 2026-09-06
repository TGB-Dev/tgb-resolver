package importing

import (
	"encoding/xml"
	"fmt"
	"math"
	"os"
	"strconv"
	"strings"

	"tgb-resolver/server/features/shared/domain"
)

type rawContest struct {
	XMLName  xml.Name     `xml:"contest"`
	Info     rawInfo      `xml:"info"`
	Problems []rawProblem `xml:"problem"`
	Teams    []rawTeam    `xml:"team"`
	Runs     []rawRun     `xml:"run"`
}

type rawInfo struct {
	ContestID              *string `xml:"contest-id"`
	Title                  *string `xml:"title"`
	StartTime              *string `xml:"starttime"`
	Length                 *string `xml:"length"`
	Penalty                *string `xml:"penalty"`
	ScoreboardFreezeLength *string `xml:"scoreboard-freeze-length"`
}

type rawProblem struct {
	ID    *string `xml:"id"`
	Label *string `xml:"label"`
	Name  *string `xml:"name"`
	Score *string `xml:"score"`
}

type rawTeam struct {
	ID       *string `xml:"id"`
	Name     *string `xml:"name"`
	Username *string `xml:"username"`
}

type rawRun struct {
	ID      *string `xml:"id"`
	Problem *string `xml:"problem"`
	Team    *string `xml:"team"`
	Time    *string `xml:"time"`
	Solved  *string `xml:"solved"`
	Penalty *string `xml:"penalty"`
	Score   *string `xml:"score"`
	Result  string  `xml:"result"`
}

func strPtr(s string) *string { return &s }

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
		return nil, fmt.Errorf("Failed to parse XML: %w", err)
	}
	if raw.XMLName.Local != "contest" {
		return nil, fmt.Errorf("Failed to parse XML: missing or invalid <contest> root element")
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
			latest[k] = val{run.Time, run.ID}
			continue
		}
		if run.Time >= prev.time && run.ID < prev.runID {
			return fmt.Errorf("run #%d for team %d, problem %d is later in time than run #%d but has a smaller id. Penalty calculation assumes run ids are monotonic in time", run.ID, run.Team, run.Problem, prev.runID)
		}
		if run.Time >= prev.time {
			latest[k] = val{run.Time, run.ID}
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
	contestID, err := getString(raw.ContestID, "contest-id")
	if err != nil {
		return Info{}, err
	}
	title, err := getString(raw.Title, "title")
	if err != nil {
		return Info{}, err
	}
	length, err := getString(raw.Length, "length")
	if err != nil {
		return Info{}, err
	}
	freezeLength, err := getString(raw.ScoreboardFreezeLength, "scoreboard-freeze-length")
	if err != nil {
		return Info{}, err
	}
	return Info{
		ContestID:              contestID,
		Title:                  title,
		StartTime:              int(math.Trunc(startTime)),
		Length:                 length,
		Penalty:                int(math.Trunc(penalty)),
		ScoreboardFreezeLength: freezeLength,
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
	label, err := getString(raw.Label, "label")
	if err != nil {
		return Problem{}, err
	}
	name := ""
	if raw.Name != nil {
		name = strings.TrimSpace(*raw.Name)
	}
	return Problem{ID: int(math.Trunc(id)), Label: label, Name: name, Score: score}, nil
}

func parseTeam(raw rawTeam) (Team, error) {
	id, err := getFloat(raw.ID, "id", nil)
	if err != nil {
		return Team{}, err
	}
	name, err := getString(raw.Name, "name")
	if err != nil {
		return Team{}, err
	}
	username, err := getString(raw.Username, "username")
	if err != nil {
		return Team{}, err
	}
	return Team{ID: int(math.Trunc(id)), Name: name, Username: username}, nil
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
	solved, err := getString(raw.Solved, "solved")
	if err != nil {
		return Run{}, err
	}
	penalty, err := getString(raw.Penalty, "penalty")
	if err != nil {
		return Run{}, err
	}
	return Run{
		ID:                          int(math.Trunc(id)),
		Problem:                     int(math.Trunc(problem)),
		Team:                        int(math.Trunc(team)),
		Time:                        math.Floor(time),
		Solved:                      solved,
		Penalized:                   strings.EqualFold(penalty, "true"),
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

func getFloat(value *string, name string, def *float64) (float64, error) {
	if value == nil {
		if def != nil {
			return *def, nil
		}
		return 0, fmt.Errorf("Missing <%s> element", name)
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		if def != nil {
			return *def, nil
		}
		return 0, fmt.Errorf("Missing <%s> element", name)
	}
	parsed, err := strconv.ParseFloat(trimmed, 64)
	if err != nil {
		return 0, fmt.Errorf("Invalid numeric value for <%s>: %s", name, trimmed)
	}
	return parsed, nil
}

func ptr(v float64) *float64 { return &v }

var verdictToAcronym = map[domain.VerdictRunResult]string{
	domain.VerdictAccepted:            "AC",
	domain.VerdictWrongAnswer:         "WA",
	domain.VerdictTimeLimitExceeded:   "TLE",
	domain.VerdictMemoryLimitExceeded: "MLE",
	domain.VerdictOutputLimitExceeded: "OLE",
	domain.VerdictInvalidReturn:       "IR",
	domain.VerdictRuntimeError:        "RTE",
	domain.VerdictCompileError:        "CE",
	domain.VerdictInternalError:       "IE",
	domain.VerdictShortCircuited:      "SC",
	domain.VerdictAborted:             "AB",
	domain.VerdictUnknown:             "??",
	domain.VerdictUnresolved:          "??",
	domain.VerdictPending:             "??",
}

func formatNum(f float64) string {
	return strconv.FormatFloat(f, 'f', -1, 64)
}

func (c *Contest) Marshal() ([]byte, error) {
	raw := rawContest{}
	raw.Info = rawInfo{
		ContestID: strPtr(c.Info.ContestID), Title: strPtr(c.Info.Title),
		StartTime: strPtr(formatNum(float64(c.Info.StartTime))), Length: strPtr(c.Info.Length),
		Penalty:                strPtr(formatNum(float64(c.Info.Penalty))),
		ScoreboardFreezeLength: strPtr(c.Info.ScoreboardFreezeLength),
	}
	for _, p := range c.Problems {
		raw.Problems = append(raw.Problems, rawProblem{
			ID: strPtr(formatNum(float64(p.ID))), Label: strPtr(p.Label), Name: strPtr(p.Name), Score: strPtr(formatNum(p.Score)),
		})
	}
	for _, tm := range c.Teams {
		raw.Teams = append(raw.Teams, rawTeam{
			ID: strPtr(formatNum(float64(tm.ID))), Name: strPtr(tm.Name), Username: strPtr(tm.Username),
		})
	}
	for _, r := range c.Runs {
		result := verdictToAcronym[r.Verdict]
		raw.Runs = append(raw.Runs, rawRun{
			ID: strPtr(formatNum(float64(r.ID))), Problem: strPtr(formatNum(float64(r.Problem))),
			Team: strPtr(formatNum(float64(r.Team))), Time: strPtr(formatNum(r.SubmissionSecondsSinceStart)),
			Solved: strPtr(r.Solved), Penalty: strPtr(formatNumBool(r.Penalized)),
			Score: strPtr(formatNum(r.Score)), Result: result,
		})
	}
	out, err := xml.Marshal(raw)
	if err != nil {
		return nil, err
	}
	return []byte(xml.Header + string(out)), nil
}

func formatNumBool(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

func getString(value *string, name string) (string, error) {
	if value == nil {
		return "", fmt.Errorf("Missing <%s> element", name)
	}
	return strings.TrimSpace(*value), nil
}
