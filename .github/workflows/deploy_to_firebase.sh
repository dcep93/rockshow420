#!/bin/bash

set -euo pipefail

: "${SA_KEY:?Set SA_KEY to the deployment service account JSON}"

cd app

GOOGLE_APPLICATION_CREDENTIALS="$(mktemp)"
export GOOGLE_APPLICATION_CREDENTIALS
trap 'rm -f "$GOOGLE_APPLICATION_CREDENTIALS"' EXIT
printf '%s' "$SA_KEY" >"$GOOGLE_APPLICATION_CREDENTIALS"
npm install -g firebase-tools
gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS"
project_id="$(jq -er .project_id "$GOOGLE_APPLICATION_CREDENTIALS")"

cat <<EOF2 >firebase.json
{
    "firestore": {
        "rules": "src/app_x/backend/firestore.rules"
    },
    "hosting": {
        "public": "dist",
        "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
        "rewrites": [{
            "source": "**",
            "destination": "/index.html"
        }]
    }
}
EOF2

cat <<EOF2 >.firebaserc
{
    "projects": {
        "default": "$project_id"
    }
}
EOF2

# Stop before publishing the app if its access rules cannot be deployed.
firebase deploy --project "$project_id" --only firestore:rules --non-interactive
firebase deploy --project "$project_id" --only hosting --non-interactive
