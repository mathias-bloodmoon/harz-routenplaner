#!/bin/sh
# Records BRouter answers for the api tests (apps/api/test/fixtures/brouter/).
# Needs a running BRouter with the Harz profiles, e.g. the compose stack: BROUTER_URL=http://localhost:17777
# Usage: BROUTER_URL=http://localhost:17777 scripts/brouter/record-fixtures.sh
set -eu
url=${BROUTER_URL:-http://localhost:17777}
out=$(dirname "$0")/../../apps/api/test/fixtures/brouter
mkdir -p "$out"

record() { # name lonlats profile alternative
  curl -sf "$url/brouter?lonlats=$2&profile=$3&alternativeidx=$4&format=geojson" |
    python3 -I -c '
import json, sys
d = json.load(sys.stdin)
f = d["features"][0]
f["geometry"]["coordinates"] = [[round(c[0], 6), round(c[1], 6), round(c[2], 1)] for c in f["geometry"]["coordinates"]]
f["properties"] = {k: f["properties"][k] for k in ("track-length", "filtered ascend", "plain-ascend", "total-time")}
json.dump({"type": "FeatureCollection", "features": [f]}, sys.stdout, separators=(",", ":"))' >"$out/$1-$3-$4.json"
  echo "recorded $1 $3 alt $4"
}

# Torfhaus → Brocken (2 waypoints: engine alternatives)
for alt in 0 1 2; do record torfhaus-brocken "10.5393,51.8108|10.6156,51.7991" harz-trails $alt; done
# Bad Harzburg → Eckertalsperre → Torfhaus (3 waypoints: one route per profile)
for p in harz-shortest harz-trails harz-gentle; do
  record harzburg-ecker-torfhaus "10.5617,51.8807|10.5800,51.8417|10.5393,51.8108" $p 0
done
