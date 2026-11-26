#!/bin/sh
# Runs ON THE SERVER (nsc-demo) as user nsc, started by .github/workflows/deploy.yml.
# Usage: remote-deploy.sh <image tag> <caddy container> [stamps true|false]
#   The third argument comes from the GitHub repository variable STAMPS_ENABLED; when given, it is written to .env.
# stdin, line 1: the ghcr.io token for this run (logged out again at the end);
#        line 2: the htpasswd line "user:$apr1$…" for the password protection (written to auth/htpasswd).
# Never touches /opt/nsc-portal; publishes no ports; validates the Caddy file before reloading Caddy.
set -eu
TAG=$1
CADDY=$2
STAMPS=${3:-}
APP=/opt/harz-routenplaner
SITE=/opt/caddy-sites/routing.caddy
cd "$APP"
IFS= read -r GHCR_TOKEN || true
IFS= read -r HTPASSWD || true
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

echo "== password protection"
mkdir -p auth && chmod 755 auth
if [ -n "$HTPASSWD" ]; then
  printf '%s\n' "$HTPASSWD" > auth/htpasswd.tmp && chmod 644 auth/htpasswd.tmp && mv auth/htpasswd.tmp auth/htpasswd
  echo "auth/htpasswd written (user ${HTPASSWD%%:*})"
fi
if [ "$(sed -n 's/^BASIC_AUTH=//p' .env)" = "false" ]; then
  echo "BASIC_AUTH=false in .env – the site is public"
elif [ ! -s auth/htpasswd ]; then
  echo "auth/htpasswd missing – set the GitHub secret SITE_BASIC_AUTH (user:password)" >&2
  exit 1
fi

echo "== routing data"
if [ ! -f data/segments/E5_N50.rd5 ] || [ ! -f data/segments/E10_N50.rd5 ]; then
  sh ./download-segments.sh data/segments
fi
if [ -f data/stamps.geojson ]; then echo "stamps.geojson present"; else echo "stamps.geojson missing"; fi

echo "== images"
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u deploy --password-stdin >/dev/null
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
