#!/usr/bin/env bash
# Builds the Bosun development shell for the iOS Simulator and installs it there.
#
# Goes straight to xcodebuild instead of `expo run:ios`, so nothing decides to target a
# physical phone and no Apple certificate is needed. The app is signed ad-hoc (not unsigned)
# so the simulator's Keychain accepts it and sign-in persists.
#
#   pnpm ios:sim          from the repo root, or `pnpm ios:sim` inside apps/mobile
#
# Afterwards run `pnpm start` and press i. Re-run this only after a change that adds a native
# module or edits app.json; everything else arrives through Metro.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d ios ]; then
  echo "» No ios/ folder yet; generating it with expo prebuild"
  npx expo prebuild --platform ios
fi

echo "» Opening the Simulator"
open -a Simulator
for _ in $(seq 1 60); do
  xcrun simctl list devices booted | grep -q Booted && break
  sleep 1
done
if ! xcrun simctl list devices booted | grep -q Booted; then
  echo "No simulator booted. In the Simulator app choose File → Open Simulator → an iPhone, then re-run." >&2
  exit 1
fi

app=build/Build/Products/Debug-iphonesimulator/Bosun.app
rm -rf "$app"   # so a failed build can't leave last time's app to be installed

echo "» Building (first time takes a few minutes)"
xcodebuild -workspace ios/Bosun.xcworkspace -scheme Bosun -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath build \
  CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=NO CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= build \
  | grep -E "error:|warning: .*Bosun|BUILD (SUCCEEDED|FAILED)" || true

if [ ! -d "$app" ]; then
  echo "Build did not produce $app. Run the xcodebuild command in the README by hand to see the full log." >&2
  exit 1
fi

echo "» Installing in the booted simulator"
xcrun simctl install booted "$app"
xcrun simctl launch booted app.getbosun.ios >/dev/null || true
echo "✔ Bosun is installed. Now run: pnpm start   (then press i)"
