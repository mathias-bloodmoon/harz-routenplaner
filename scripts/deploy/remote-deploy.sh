#!/bin/sh
# Runs ON THE SERVER (nsc-demo) as user nsc, started by .github/workflows/deploy.yml.
# Usage: remote-deploy.sh <image tag> <caddy container> [stamps true|false]
#   The third argument comes from the GitHub repository variable STAMPS_ENABLED; when given, it is written to .env.
# Reads the ghcr.io token for this run from stdin (logged out again at the end).
# Never touches /opt/nsc-portal; publishes no ports; validates the Caddy file before reloading Caddy.
set -eu
TAG=$1
CADDY=$2
STAMPS=${3:-}
APP=/opt/harz-routenplaner
SITE=/opt/caddy-sites/routing.caddy
cd "$APP"
compose() { docker compose -f "$APP/docker-compose.yml" "$@"; }

echo "== settings (.env)"
[ -f .env ] || { cp env.production.example .env; echo "created .env from env.production.example"; }
previous=$(sed -n 's/^HARZ_TAG=//p' .env)
sed -i "/^HARZ_TAG_PREVIOUS=/d" .env
echo "HARZ_TAG_PREVIOUS=${previous:-latest}" >> .env
sed -i "s/^HARZ_TAG=.*/HARZ_TAG=$TAG/" .env
grep -q '^HARZ_TAG=' .env || echo "HARZ_TAG=$TAG" >> .env
echo "tag: ${previous:-none} -> $TAG"
case "$STAMPS" in
  true | false)
    sed -i "/^STAMPS_ENABLED=/d" .env
    echo "STAMPS_ENABLED=$STAMPS" >> .env
    echo "STAMPS_ENABLED=$STAMPS (repository variable)"
    ;;
esac

echo "== routing data"
if [ ! -f data/segments/E5_N50.rd5 ] || [ ! -f data/segments/E10_N50.rd5 ]; then
  sh ./download-segments.sh data/segments
fi
if [ -f data/stamps.geojson ]; then echo "stamps.geojson present"; else echo "stamps.geojson missing"; fi

echo "== images"
docker login ghcr.io -u deploy --password-stdin >/dev/null
trap 'docker logout ghcr.io >/dev/null 2>&1 || true' EXIT
compose pull --quiet
docker logout ghcr.io >/dev/null

echo "== start"
compose up -d --remove-orphans --wait --wait-timeout 240
compose ps

echo "== caddy"
cp "$SITE" routing.caddy.prev 2>/dev/null || : > routing.caddy.prev
cat routing.caddy > "$SITE"
if ! docker exec "$CADDY" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile; then
  echo "Caddy validation FAILED – restoring the previous routing.caddy, Caddy is not reloaded" >&2
  cat routing.caddy.prev > "$SITE"
  exit 1
fi
docker exec "$CADDY" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
echo "caddy reloaded"

echo "== memory"
docker stats --no-stream --format '{{.Name}}\t{{.MemUsage}}' $(compose ps -q)
