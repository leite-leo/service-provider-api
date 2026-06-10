#!/usr/bin/env bash
set -euo pipefail

command -v jq >/dev/null 2>&1 || {
  echo "jq is required. Install with: brew install jq (macOS) or apt install jq (Linux)"
  exit 1
}

: "${FIREBASE_WEB_API_KEY:?Set FIREBASE_WEB_API_KEY in your environment}"

EMAIL="${1:-admin@admin.com}"
PASSWORD="${2:-Admin123}"

curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"returnSecureToken\":true}" \
  | jq -r '.idToken'
