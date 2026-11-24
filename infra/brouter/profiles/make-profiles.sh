#!/bin/sh
# Generates the three hiking profiles from BRouter's stock hiking-mountain.brf (same BRouter release).
# Usage: make-profiles.sh <path/to/hiking-mountain.brf> <output dir>
# Fails if a parameter is not found, so a changed upstream profile cannot slip through silently.
set -eu
base=$1
out=$2
mkdir -p "$out"

set_param() {
  file=$1 name=$2 value=$3
  if ! grep -qE "^assign +$name( +|=)" "$file"; then
    echo "make-profiles: parameter $name not found in $base" >&2
    exit 1
  fi
  sed -E -i "s/^(assign +$name +(= +)?)[^ #]+/\1$value/" "$file"
}

# Kürzeste / Shortest: shortest foot route, access tags still respected
cp "$base" "$out/harz-shortest.brf"
set_param "$out/harz-shortest.brf" shortest_way 1
set_param "$out/harz-shortest.brf" hiking_routes_preference 0.0

# Wanderwege / Trail-friendly: prefers marked hiking routes and paths, avoids paved roads
cp "$base" "$out/harz-trails.brf"
set_param "$out/harz-trails.brf" hiking_routes_preference 1.0
set_param "$out/harz-trails.brf" path_preference 10.0

# Sanft / Gentle: penalises climbs and steep descents, avoids SAC T3 paths
cp "$base" "$out/harz-gentle.brf"
set_param "$out/harz-gentle.brf" consider_elevation true
set_param "$out/harz-gentle.brf" uphillcostvalue 15
set_param "$out/harz-gentle.brf" uphillcutoffvalue 1.5
set_param "$out/harz-gentle.brf" downhillcostvalue 10
set_param "$out/harz-gentle.brf" downhillcutoffvalue 1.5
set_param "$out/harz-gentle.brf" SAC_scale_limit 2
set_param "$out/harz-gentle.brf" hiking_routes_preference 0.5

echo "make-profiles: wrote harz-shortest.brf, harz-trails.brf, harz-gentle.brf to $out"
