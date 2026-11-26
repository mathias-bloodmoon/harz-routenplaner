#!/bin/sh
# Checks the routing of a running stack against the sample tours of milestone M2.
# Usage: scripts/brouter/smoke-test.sh [base URL, default http://localhost]
# SMOKE_AUTH="user:password" for a site behind the password protection (production).
# Success: three "OK" lines and exit code 0.
set -eu
base=${1:-http://localhost}

check() { # name expectation json-body
  answer=$(curl -s ${SMOKE_AUTH:+-u "$SMOKE_AUTH"} -X POST -H "Content-Type: application/json" -d "$3" "$base/api/route" -w '\n%{http_code}')
  python3 -I - "$1" "$2" "$answer" <<'PY'
import json, sys
name, expect, answer = sys.argv[1], sys.argv[2], sys.argv[3]
body, status = answer.rsplit("\n", 1)
data = json.loads(body)
if expect.startswith("error:"):
    ok = status == "400" and data.get("error") == expect[6:]
    detail = f"HTTP {status} {data.get('error')}"
else:
    routes = data.get("routes", [])
    kinds = [r["kind"] for r in routes]
    lengths = [round(r["distanceM"] / 1000, 1) for r in routes]
    if expect == "alternatives":
        ok = status == "200" and 2 <= len(routes) <= 3 and all(5 < l < 20 for l in lengths)
    else:
        ok = status == "200" and kinds == ["shortest", "trails", "gentle"][: len(kinds)] and len(routes) >= 2
    detail = f"HTTP {status}, {len(routes)} routes {kinds} {lengths} km"
print(("OK   " if ok else "FAIL ") + name + ": " + detail)
sys.exit(0 if ok else 1)
PY
}

check "Torfhaus → Brocken" alternatives \
  '{"waypoints":[{"lat":51.8108,"lng":10.5393},{"lat":51.7991,"lng":10.6156}]}'
check "Bad Harzburg → Eckertalsperre → Torfhaus" profiles \
  '{"waypoints":[{"lat":51.8807,"lng":10.5617},{"lat":51.8417,"lng":10.58},{"lat":51.8108,"lng":10.5393}]}'
check "Outside the area (Berlin)" error:outside-area \
  '{"waypoints":[{"lat":51.8108,"lng":10.5393},{"lat":52.52,"lng":13.405}]}'
