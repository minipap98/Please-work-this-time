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

# Everything below goes through `xcrun simctl`, which comes with Xcode's command line tools and
# works without a window. The window is opened when one exists: Simulator.app in older Xcodes,
# DeviceHub.app in Xcode 27 (where the simulator screens live now).
if ! xcrun simctl list runtimes 2>/dev/null | grep -q '^iOS'; then
  if [ ! -d /Applications/Xcode.app ]; then
    echo "Xcode isn't installed, and the iOS Simulator comes with it." >&2
    echo "Install Xcode from the Mac App Store (free, about 15 GB), open it once so it finishes setting up," >&2
    echo "then run:  sudo xcode-select -s /Applications/Xcode.app  and re-run this." >&2
  elif [[ "$(xcode-select -p 2>/dev/null || true)" != /Applications/Xcode.app/* ]]; then
    echo "Xcode is installed but the command line isn't pointed at it. Run this once, then re-run:" >&2
    echo "    sudo xcode-select -s /Applications/Xcode.app" >&2
  else
    echo "No iOS Simulator runtime is installed. In Xcode: Settings → Components (or Platforms) → install one, then re-run." >&2
  fi
  exit 1
fi

xcode_app="$(xcode-select -p 2>/dev/null | sed -E 's|/Contents/Developer/?$||')"
for sim_app in "$xcode_app/Contents/Developer/Applications/Simulator.app" \
               "$xcode_app/Contents/Applications/DeviceHub.app" \
               /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app \
               /Applications/Xcode.app/Contents/Applications/DeviceHub.app; do
  if [ -d "$sim_app" ]; then
    echo "» Opening $(basename "$sim_app" .app)"
    open -a "$sim_app" || true
    break
  fi
done

# Which device: IOS_SIM_UDID if set, else the first booted one, else boot the first available iPhone.
udid="${IOS_SIM_UDID:-}"
if [ -z "$udid" ]; then
  udid="$(xcrun simctl list devices booted | grep -m1 -oE '[0-9A-F-]{36}' || true)"
fi
if [ -z "$udid" ]; then
  udid="$(xcrun simctl list devices available | grep -m1 'iPhone' | grep -oE '[0-9A-F-]{36}' || true)"
  if [ -z "$udid" ]; then
    echo "No iPhone simulator is available. In Xcode: Settings → Components (or Platforms) → install an iOS Simulator runtime, then re-run." >&2
    exit 1
  fi
  echo "» Booting the simulator"
  xcrun simctl boot "$udid" 2>/dev/null || true
fi
xcrun simctl bootstatus "$udid" -b >/dev/null
device_name="$(xcrun simctl list devices | grep "$udid" | sed -E 's/^ *(.*) \([0-9A-F-]{36}\).*/\1/')"
echo "» Using $device_name ($udid)"

app=build/Build/Products/Debug-iphonesimulator/Bosun.app
rm -rf "$app"   # so a failed build can't leave last time's app to be installed

echo "» Building (first time takes a few minutes; full log in build/xcodebuild.log)"
mkdir -p build
set +o pipefail
xcodebuild -workspace ios/Bosun.xcworkspace -scheme Bosun -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath build \
  CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=NO CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= build \
  2>&1 | tee build/xcodebuild.log | grep -E "error:|warning: .*Bosun|BUILD (SUCCEEDED|FAILED)" || true
set -o pipefail

if [ ! -d "$app" ]; then
  echo "Build did not produce $app. Last lines of build/xcodebuild.log:" >&2
  tail -40 build/xcodebuild.log >&2
  exit 1
fi

echo "» Installing on $device_name"
xcrun simctl install "$udid" "$app"
xcrun simctl launch "$udid" app.getbosun.ios >/dev/null || true
echo "✔ Bosun is installed. Now start Metro from the repo root:  pnpm dev:mobile   (then press i)"
