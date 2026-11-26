#!/bin/sh
# Password protection (HTTP basic auth) for the whole site, written at container start, included by nginx.
# BASIC_AUTH=true needs /srv/auth/htpasswd (mounted read-only; production: written by the deploy from the
# GitHub secret SITE_BASIC_AUTH). Without the file the container refuses to start: fail closed, never public.
set -eu
mkdir -p /tmp/runtime
if [ "${BASIC_AUTH:-false}" = "true" ]; then
  if [ ! -s /srv/auth/htpasswd ]; then
    echo "basic-auth: BASIC_AUTH=true but /srv/auth/htpasswd is missing or empty – refusing to start" >&2
    exit 1
  fi
  printf 'auth_basic "Harz-Routenplaner";\nauth_basic_user_file /srv/auth/htpasswd;\n' > /tmp/runtime/auth.conf
  echo "basic-auth: on"
else
  printf 'auth_basic off;\n' > /tmp/runtime/auth.conf
  echo "basic-auth: off"
fi
