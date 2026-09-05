#!/bin/sh
# Live parity check: imports apps/server-go/testdata/parity.xml on both the
# Go server (:5002) and a locally running .NET server (:5003) and diffs the
# normalized snapshots (nulls stripped, showVersion/meta ignored).
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

DATA_DIR="$(mktemp -d)"
PORT=5002 DATA_DIR="$DATA_DIR" go run ./apps/server-go >"$DATA_DIR/go.log" 2>&1 &
GO_PID=$!
trap 'kill $GO_PID' EXIT INT TERM
sleep 5

BODY="$(python3 -c "import json; print(json.dumps({'xml': open('$ROOT/apps/server-go/testdata/parity.xml').read()}))")"
curl -s -X POST localhost:5002/import/xml -H 'Content-Type: application/json' -d "$BODY" -o "$DATA_DIR/go.json"
curl -s -X POST localhost:5003/import/xml -H 'Content-Type: application/json' -d "$BODY" -o "$DATA_DIR/dotnet.json"

python3 - "$DATA_DIR/go.json" "$DATA_DIR/dotnet.json" <<'EOF'
import json, sys
def norm(o):
    if isinstance(o, dict):
        return {k: norm(v) for k, v in o.items() if v is not None and k not in ("$schema", "showVersion", "meta")}
    if isinstance(o, list):
        return [norm(v) for v in o]
    return o
g = norm(json.load(open(sys.argv[1])))
d = norm(json.load(open(sys.argv[2])))
if g == d:
    print("PARITY OK")
else:
    print("PARITY DIVERGED")
    sys.exit(1)
EOF
