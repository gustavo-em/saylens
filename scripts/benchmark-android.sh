#!/usr/bin/env bash

set -euo pipefail

APP_PACKAGE="com.gustavoem.saylens"
MEASUREMENT_SECONDS="${1:-30}"

if ! command -v adb >/dev/null 2>&1; then
  echo "adb is required and was not found in PATH." >&2
  exit 1
fi

if ! [[ "$MEASUREMENT_SECONDS" =~ ^[0-9]+$ ]] || [ "$MEASUREMENT_SECONDS" -lt 10 ]; then
  echo "Usage: $0 [measurement-seconds >= 10]" >&2
  exit 1
fi

adb get-state >/dev/null
adb logcat -c
adb shell am force-stop "$APP_PACKAGE"
adb shell monkey \
  -p "$APP_PACKAGE" \
  -c android.intent.category.LAUNCHER \
  1 >/dev/null 2>&1

echo "Warming up and measuring for ${MEASUREMENT_SECONDS}s..."
sleep "$MEASUREMENT_SECONDS"

echo
echo "=== Detector and camera ==="
adb logcat -d | grep -E \
  "SayLensDetector|SayLens camera|AndroidRuntime: FATAL" || true

echo
echo "=== Process CPU snapshot ==="
adb shell top -b -n 1 | grep -E "PID|saylens" || true

echo
echo "=== Process memory ==="
adb shell dumpsys meminfo "$APP_PACKAGE"
