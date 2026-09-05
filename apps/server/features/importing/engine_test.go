package importing

import "testing"

const testContestXML = `<contest><info><contest-id>c1</contest-id><title>Test</title><starttime>0</starttime><length>0:05:00</length><penalty>20</penalty><scoreboard-freeze-length>0:01:00</scoreboard-freeze-length></info>` +
	`<problem><id>1</id><label>A</label><name>A</name><score>100</score></problem>` +
	`<team><id>1</id><name>Alice</name><username>alice</username></team>` +
	`<team><id>2</id><name>Bob</name><username>bob</username></team>` +
	`<run><id>1</id><problem>1</problem><team>1</team><time>10</time><solved>true</solved><penalty>false</penalty><score>100</score><result>AC</result></run>` +
	`<run><id>2</id><problem>1</problem><team>2</team><time>250</time><solved>true</solved><penalty>false</penalty><score>100</score><result>AC</result></run></contest>`

func TestConvertPostFreezeRevealOrder(t *testing.T) {
	res, err := Convert([]byte(testContestXML), nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(res.ResolveEvents) != 2 {
		t.Fatalf("want 2 events got %d", len(res.ResolveEvents))
	}
	first, second := res.ResolveEvents[0], res.ResolveEvents[1]
	if first.UserID != 2 || first.IsFinalize {
		t.Fatalf("want bob resolve first, got %+v", first)
	}
	if first.NewRank != 2 || first.NewTotalScore != 100 {
		t.Fatalf("want bob rank 2 score 100, got %+v", first)
	}
	if second.UserID != 1 || !second.IsFinalize {
		t.Fatalf("want alice finalize second, got %+v", second)
	}
	if second.NewRank != 1 {
		t.Fatalf("want alice rank 1, got %+v", second)
	}
	if len(res.PreFreezeSnapshot) != 2 {
		t.Fatalf("want 2 freeze entries got %d", len(res.PreFreezeSnapshot))
	}
	if res.PreFreezeSnapshot[1].Problems[0].Verdict != "Unresolved" {
		t.Fatalf("want bob problem Unresolved at freeze, got %s", res.PreFreezeSnapshot[1].Problems[0].Verdict)
	}
}

func TestConvertExcludesUsernames(t *testing.T) {
	res, err := Convert([]byte(testContestXML), []string{"bob"})
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Users) != 1 || res.Users[0].Username != "alice" {
		t.Fatalf("want only alice, got %+v", res.Users)
	}
	if len(res.ResolveEvents) != 1 || !res.ResolveEvents[0].IsFinalize {
		t.Fatalf("want single finalize event, got %+v", res.ResolveEvents)
	}
}
