#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/.."

BUNDLE="android/app/build/outputs/bundle/release/app-release.aab"

if [ ! -f .env ]; then
  echo "No .env found. Copy .env.example to .env first." >&2
  exit 1
fi

read_env() {
  grep -E "^$1=" .env | tail -1 | cut -d= -f2- | tr -d '"'\''' | xargs
}

VERSION_CODE="$(read_env VERSION_CODE)"
VERSION_NAME="$(read_env VERSION_NAME)"

if ! [[ "$VERSION_CODE" =~ ^[0-9]+$ ]]; then
  echo "VERSION_CODE in .env must be a whole number, got '$VERSION_CODE'." >&2
  exit 1
fi

if [ -z "$VERSION_NAME" ]; then
  echo "VERSION_NAME in .env is empty." >&2
  exit 1
fi

# The Play Store rejects anything signed with the debug key, so say plainly
# which key this build will carry before spending three minutes on it.
STORE_FILE="$(read_env SAYLENS_UPLOAD_STORE_FILE)"

if [ -n "$STORE_FILE" ]; then
  if [ ! -f "$STORE_FILE" ]; then
    echo "SAYLENS_UPLOAD_STORE_FILE points at '$STORE_FILE', which does not exist." >&2
    exit 1
  fi
  for key in SAYLENS_UPLOAD_STORE_PASSWORD SAYLENS_UPLOAD_KEY_ALIAS SAYLENS_UPLOAD_KEY_PASSWORD; do
    if [ -z "$(read_env "$key")" ]; then
      echo "$key is empty in .env but a keystore was given." >&2
      exit 1
    fi
  done
  SIGNED_WITH="upload key ($STORE_FILE)"
else
  SIGNED_WITH="DEBUG key (device testing only, Play Store will reject it)"
fi

echo "Version:    $VERSION_NAME ($VERSION_CODE)"
echo "Signed with: $SIGNED_WITH"
echo

rm -f "$BUNDLE"
(cd android && ./gradlew app:bundleRelease)

if [ ! -f "$BUNDLE" ]; then
  echo "Bundle was not produced at $BUNDLE" >&2
  exit 1
fi

echo
echo "Bundle: $BUNDLE ($(du -h "$BUNDLE" | cut -f1))"
