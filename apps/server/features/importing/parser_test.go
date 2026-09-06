package importing

import "testing"

func TestParseRejectsMissingContestRoot(t *testing.T) {
	_, err := Parse([]byte(`<wrong/>`))
	if err == nil {
		t.Fatal("want error")
	}
}

func TestParseRejectsMalformedXML(t *testing.T) {
	_, err := Parse([]byte(`<contest><info>`))
	if err == nil {
		t.Fatal("want error")
	}
}

func TestParseRejectsNonMonotonicRunIDs(t *testing.T) {
	xml := `<contest><info><contest-id>c</contest-id><title>t</title><starttime>0</starttime><length>300</length><penalty>20</penalty><scoreboard-freeze-length>60</scoreboard-freeze-length></info>` +
		`<problem><id>1</id><label>A</label><name>A</name><score>100</score></problem>` +
		`<team><id>1</id><name>T</name><username>t</username></team>` +
		`<run><id>2</id><problem>1</problem><team>1</team><time>10</time><solved>false</solved><penalty>true</penalty><score>0</score><result>WA</result></run>` +
		`<run><id>1</id><problem>1</problem><team>1</team><time>20</time><solved>false</solved><penalty>true</penalty><score>0</score><result>WA</result></run></contest>`
	_, err := Parse([]byte(xml))
	if err == nil {
		t.Fatal("want monotonicity error")
	}
}
