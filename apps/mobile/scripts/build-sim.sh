#!/usr/bin/env bash
# Builds the Bosun development shell for the iOS Simulator and installs it there.
#
# Goes straight to xcodebuild instead of `expo run:ios`, so nothing decides to target a
# physical phone and no Apple certificate is needed. The app is signed ad-hoc (not unsigned)
# so the simulator's Keychain accepts it and sign-in persists.
#
#   pnpm ios:sim          from the repo root, or `pnpm ios:sim` inside apps/mobile
#
# Afterwards run `pnpm dev:mobile` from the repo root (or `pnpm start` inside apps/mobile) and
# press i. Re-run this only after a change that adds a native module or edits app.json;
# everything else arrives through Metro.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d ios ]; then
  echo "» No ios/ folder yet; generating it with expo prebuild"
  npx expo prebuild --platform ios
fi

# The Simulator ships inside Xcode. `open -a Simulator` fails when Xcode isn't installed or the
# command line points at the Command Line Tools instead of Xcode, so look where xcode-select says.
dev_dir="$(xcode-select -p 2>/dev/null || true)"
sim_app="$dev_dir/Applications/Simulator.app"
if [ ! -d "$sim_app" ]; then
  if [ -d /Applications/Xcode.app ]; then
    echo "Xcode is installed but the command line isn't pointed at it. Run this once, then re-run:" >&2
    echo "    sudo xcode-select -s /Applications/Xcode.app" >&2
  else
    echo "Xcode isn't installed, and the iOS Simulator comes with it." >&2
    echo "Install Xcode from the Mac App Store (free, about 15 GB), open it once so it finishes setting up," >&2
    echo "then run:  sudo xcode-select -s /Applications/Xcode.app  and re-run this." >&2
  fi
  exit 1
fi

echo "» Opening the Simulator"
open -a "$sim_app"
if ! xcrun simctl list devices booted | grep -q Booted; then
  udid="$(xcrun simctl list devices available | grep -m1 'iPhone' | grep -oE '[0-9A-F-]{36}' || true)"
  if [ -n "$udid" ]; then
    xcrun simctl boot "$udid" 2>/dev/null || true
  fi
fi
for _ in $(seq 1 60); do
  xcrun simctl list devices booted | grep -q Booted && break
  sleep 1
done
if ! xcrun simctl list devices booted | grep -q Booted; then
  echo "No iPhone simulator is available. In Xcode: Settings → Components (or Platforms) → install an iOS Simulator runtime, then re-run." >&2
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
echo "✔ Bosun is installed. Now start Metro from the repo root:  pnpm dev:mobile   (then press i)"
