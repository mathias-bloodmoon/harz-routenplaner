#!/bin/sh
# Downloads the BRouter segment files for the Harz + 40 km buffer (lat 51.13–52.31, lon 9.64–12.20):
# E5_N50 (lon 5–10, lat 50–55) and E10_N50 (lon 10–15, lat 50–55), together about 300 MB.
# Usage: scripts/brouter/download-segments.sh [target dir, default data/segments]
# Segments are rebuilt weekly from OSM by brouter.de; re-run to update (then restart the brouter container).
set -eu
target=${1:-$(dirname "$0")/../../data/segments}
mkdir -p "$target"
for tile in E5_N50 E10_N50; do
  echo "Downloading $tile.rd5 …"
  curl -fL --retry 3 -o "$target/$tile.rd5.part" "https://brouter.de/brouter/segments4/$tile.rd5"
  mv "$target/$tile.rd5.part" "$target/$tile.rd5"
done
ls -l "$target"
