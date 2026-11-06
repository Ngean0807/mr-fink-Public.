#!/usr/bin/env bash
# Waits until the live site serves this build (or a later one): status.json carries the build time.
# Usage: SITE=https://.../ BUILT=2026-11-06T05:40:00+00:00 verify-live.sh [tries]
set -u
tries=${1:-24}
got=""
for i in $(seq 1 "$tries"); do
  got=$(curl -fsS --max-time 15 "${SITE}data/status.json?v=${GITHUB_RUN_ID:-local}-$i" | jq -r .checkedAt 2>/dev/null || echo "")
  if [ -n "$got" ] && [[ ! "$got" < "$BUILT" ]]; then
    echo "Live after $((i * 10))s: $got"
    exit 0
  fi
  sleep 10
done
echo "::warning::The live site still serves ${got:-nothing}; this build is $BUILT"
exit 1
