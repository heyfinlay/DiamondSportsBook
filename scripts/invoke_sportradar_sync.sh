#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-schedule}"
PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
FUNCTION_BASE_URL="${SUPABASE_FUNCTIONS_URL:-}"
SHARED_SECRET="${SPORTRADAR_SYNC_SHARED_SECRET:-}"
BODY="${SPORTRADAR_SYNC_BODY:-}"

if [[ -z "${FUNCTION_BASE_URL}" ]]; then
  if [[ -z "${PROJECT_REF}" ]]; then
    echo "Set SUPABASE_PROJECT_REF or SUPABASE_FUNCTIONS_URL before invoking."
    exit 1
  fi

  FUNCTION_BASE_URL="https://${PROJECT_REF}.functions.supabase.co"
fi

if [[ -z "${SHARED_SECRET}" ]]; then
  echo "SPORTRADAR_SYNC_SHARED_SECRET is required for non-user CLI invocations."
  exit 1
fi

if [[ -z "${BODY}" ]]; then
  BODY="{\"mode\":\"${MODE}\"}"
fi

curl --fail-with-body --silent --show-error \
  -X POST "${FUNCTION_BASE_URL}/sportradar-sync" \
  -H "Content-Type: application/json" \
  -H "x-sync-secret: ${SHARED_SECRET}" \
  -d "${BODY}"

echo ""
