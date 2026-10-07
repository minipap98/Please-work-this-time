// iOS 27 refuses to launch an app that hasn't adopted the UIScene life cycle (it traps in
// UIApplication at startup). Expo SDK 57 ships `ExpoAppSceneDelegate` for exactly this but its
// template doesn't use it yet, so this plugin wires it in at prebuild time:
//   1. Info.plist gets a UIApplicationSceneManifest pointing at our SceneDelegate.
//   2. SceneDelegate.swift (a subclass of ExpoAppSceneDelegate) is added to the Xcode target.
//   3. AppDelegate.swift conforms to ExpoReactNativeFactoryProvider and stops creating the window
//      itself; the scene delegate creates it and starts React Native.
// Remove this file (and its entry in app.json) once the Expo template adopts scenes.
const { withAppDelegate, withDangerousMod, withInfoPlist, withXcodeProject, IOSConfig } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SCENE_DELEGATE = `internal import Expo
import UIKit

// Creates the window and starts React Native under the scene life cycle (required by iOS 27).
// Everything else (URLs, universal links, foreground/background) is forwarded to AppDelegate by Expo.
@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {}
`;

function withSceneManifest(config) {
  return withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "SceneDelegate",
          },
        ],
      },
    };
    return c;
  });
}

function withSceneDelegateFile(config) {
  config = withDangerousMod(config, [
    "ios",
    async (c) => {
      const projectName = IOSConfig.XcodeUtils.getProjectName(c.modRequest.projectRoot);
      const file = path.join(c.modRequest.platformProjectRoot, projectName, "SceneDelegate.swift");
      fs.writeFileSync(file, SCENE_DELEGATE);
      return c;
    },
  ]);
  return withXcodeProject(config, (c) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(c.modRequest.projectRoot);
    const relative = `${projectName}/SceneDelegate.swift`;
    if (!c.modResults.hasFile(relative)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath: relative, groupName: projectName, project: c.modResults });
    }
    return c;
  });
}

function withSceneAwareAppDelegate(config) {
  return withAppDelegate(config, (c) => {
    let src = c.modResults.contents;
    if (src.includes("ExpoReactNativeFactoryProvider")) return c;

    src = src.replace("class AppDelegate: ExpoAppDelegate {", "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {");

    // The scene delegate owns the window and starts React Native; the app delegate only builds the factory.
    const start = /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\(\s*\n\s*withModuleName: "main",\s*\n\s*in: window,\s*\n\s*launchOptions: launchOptions\)\s*\n#endif\n/;
    if (!start.test(src)) {
      throw new Error("withSceneDelegate: AppDelegate.swift doesn't match the Expo SDK 57 template; update the plugin.");
    }
    src = src.replace(start, "    // React Native is started by SceneDelegate (iOS 27 scene life cycle).\n");
    c.modResults.contents = src;
    return c;
  });
}

module.exports = function withSceneDelegate(config) {
  return withSceneAwareAppDelegate(withSceneDelegateFile(withSceneManifest(config)));
};
