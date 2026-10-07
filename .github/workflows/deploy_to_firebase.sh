#!/bin/bash

set -euo pipefail

SA_KEY="$1"

cd app

export GOOGLE_APPLICATION_CREDENTIALS="gac.json"
echo "$SA_KEY" >"$GOOGLE_APPLICATION_CREDENTIALS"
npm install -g firebase-tools
gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS"
project_id="$(cat $GOOGLE_APPLICATION_CREDENTIALS | jq -r .project_id)"

cat <<EOF2 >firebase.json
{
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

firebase deploy --project "$project_id"
