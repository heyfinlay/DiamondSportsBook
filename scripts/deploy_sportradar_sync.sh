#!/usr/bin/env bash

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-${1:-}}"

if [[ -z "${PROJECT_REF}" ]]; then
  echo "Usage: SUPABASE_PROJECT_REF=your-project-ref SPORTRADAR_API_KEY=... bash scripts/deploy_sportradar_sync.sh"
  echo "   or: bash scripts/deploy_sportradar_sync.sh your-project-ref"
  exit 1
fi

if [[ -z "${SPORTRADAR_API_KEY:-}" ]]; then
  echo "SPORTRADAR_API_KEY is required."
  exit 1
fi

SECRET_ARGS=("SPORTRADAR_API_KEY=${SPORTRADAR_API_KEY}")

if [[ -n "${SPORTRADAR_SYNC_SHARED_SECRET:-}" ]]; then
  SECRET_ARGS+=("SPORTRADAR_SYNC_SHARED_SECRET=${SPORTRADAR_SYNC_SHARED_SECRET}")
fi

echo "Setting function secrets on project ${PROJECT_REF}..."
supabase secrets set --project-ref "${PROJECT_REF}" "${SECRET_ARGS[@]}"

echo "Deploying edge function sportradar-sync..."
supabase functions deploy sportradar-sync --project-ref "${PROJECT_REF}"

echo ""
echo "Deployment complete."
echo "Next:"
echo "1. Apply the provider config template in docs/sportradar-provider-config.sql"
echo "2. Invoke the sync with:"
echo "   SUPABASE_PROJECT_REF=${PROJECT_REF} SPORTRADAR_SYNC_SHARED_SECRET=... bash scripts/invoke_sportradar_sync.sh schedule"
