#!/bin/sh
# Writes /tmp/runtime/config.json at container start (served as /config.json by nginx).
# STAMPS_ENABLED: only the literal "true" enables the stamp layer (CONCEPT.md §3).
# OPERATOR_NAME / OPERATOR_ADDRESS (lines separated by "|") / OPERATOR_EMAIL: Impressum, set on the server only.
set -eu

json_string() {
  # escape backslash and double quote, drop control characters
  printf '"%s"' "$(printf '%s' "$1" | tr -d '\000-\037' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')"
}

stamps=false
[ "${STAMPS_ENABLED:-false}" = "true" ] && stamps=true

mkdir -p /tmp/runtime
{
  printf '{"stampsEnabled":%s,"operator":{"name":%s,"address":%s,"email":%s}}\n' \
    "$stamps" \
    "$(json_string "${OPERATOR_NAME:-}")" \
    "$(json_string "${OPERATOR_ADDRESS:-}")" \
    "$(json_string "${OPERATOR_EMAIL:-}")"
} > /tmp/runtime/config.json.tmp
mv /tmp/runtime/config.json.tmp /tmp/runtime/config.json
echo "runtime-config: stampsEnabled=$stamps, operator address $( [ -n "${OPERATOR_ADDRESS:-}" ] && echo set || echo missing )"
