#!/bin/bash
# eas-update-safe.sh
# Usage: bash scripts/eas-update-safe.sh <dev|staging|production> "<message>"
#
# Swaps in the correct amplify_outputs.json for the target environment,
# verifies it matches the expected AppSync URL, publishes the OTA update
# to both platforms, then restores your local amplify_outputs.json back
# to whatever it was before running this script.

set -e

ENV=$1
MESSAGE=$2

if [ -z "$ENV" ] || [ -z "$MESSAGE" ]; then
  echo "Usage: bash scripts/eas-update-safe.sh <dev|staging|production> \"<message>\""
  exit 1
fi

case $ENV in
  production)
    CONFIG_FILE="amplify_outputs.production.json"
    EXPECTED_URL="hwdbf6ue3vh6xmw6cmbffm7j7y"
    BRANCH="production"
    ;;
  staging)
    CONFIG_FILE="amplify_outputs.staging.json"
    EXPECTED_URL="5ojmsd7i5nbq5foh2wefkdhj3e"
    BRANCH="staging"
    ;;
  dev)
    CONFIG_FILE="amplify_outputs.dev.json"
    EXPECTED_URL="quodb6sognf3vhsracqwpkyjb4"
    BRANCH="development"
    ;;
  *)
    echo "Unknown environment: $ENV (expected dev, staging, or production)"
    exit 1
    ;;
esac

echo "Backing up current amplify_outputs.json..."
cp amplify_outputs.json /tmp/amplify_outputs.current.json.bak

echo "Swapping in $CONFIG_FILE for $ENV..."
cp "$CONFIG_FILE" amplify_outputs.json

ACTUAL_URL=$(grep -o '"url": *"[^"]*"' amplify_outputs.json | grep -o "https://[a-z0-9]*" | sed 's|https://||')

if [[ "$ACTUAL_URL" != *"$EXPECTED_URL"* ]]; then
  echo "ERROR: amplify_outputs.json does not match expected $ENV URL ($EXPECTED_URL). Aborting, no publish happened."
  cp /tmp/amplify_outputs.current.json.bak amplify_outputs.json
  rm /tmp/amplify_outputs.current.json.bak
  exit 1
fi

echo "Verified $ENV config is active (matches $EXPECTED_URL)"
echo "Publishing to branch: $BRANCH"

eas update --branch "$BRANCH" --message "$MESSAGE" --platform ios
eas update --branch "$BRANCH" --message "$MESSAGE" --platform android

echo "Restoring previous local amplify_outputs.json..."
cp /tmp/amplify_outputs.current.json.bak amplify_outputs.json
rm /tmp/amplify_outputs.current.json.bak

echo "Done. Local amplify_outputs.json restored to its previous state."
