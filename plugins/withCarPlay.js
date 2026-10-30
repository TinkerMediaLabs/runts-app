// Lists Runts in Apple CarPlay as an audio app.
// The player library (@rntp/player) already provides the CarPlay screen (RNTPCarPlaySceneDelegate) and CarPlay
// reads the same browse tree as Android Auto. CarPlay needs three things in the iOS project:
//  1. the CarPlay audio entitlement (Apple granted it to this account; the App ID must have "CarPlay Audio App" ticked);
//  2. a UIApplicationSceneManifest in Info.plist with a phone scene and a CarPlay scene;
//  3. the app moved to the window-scene lifecycle: AppDelegate starts React Native with no window, and a new
//     PhoneSceneDelegate.swift creates the phone window (see carplay/ for the two files).
// iOS only; Android is untouched.
const fs = require('fs');
const path = require('path');
const {
  withDangerousMod, withInfoPlist, withEntitlementsPlist, withXcodeProject, IOSConfig,
} = require('@expo/config-plugins');
const { patchAppDelegate } = require('./carplay/patchAppDelegate');
const { PHONE_SCENE_DELEGATE } = require('./carplay/phoneSceneDelegate');

const withEntitlement = (config) =>
  withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.carplay-audio'] = true;
    return cfg;
  });

const withSceneManifest = (config) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Phone',
            UISceneClassName: 'UIWindowScene',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).PhoneSceneDelegate',
          },
        ],
        CPTemplateApplicationSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'CarPlay',
            UISceneClassName: 'CPTemplateApplicationScene',
            UISceneDelegateClassName: 'RNTPCarPlaySceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });

const withSourceFiles = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, cfg.modRequest.projectName);
      const appDelegatePath = path.join(dir, 'AppDelegate.swift');
      if (!fs.existsSync(appDelegatePath)) {
        throw new Error(`withCarPlay: ${appDelegatePath} not found. Is this project using the Swift AppDelegate (Expo SDK 53+)?`);
      }
      fs.writeFileSync(appDelegatePath, patchAppDelegate(fs.readFileSync(appDelegatePath, 'utf8')));
      fs.writeFileSync(path.join(dir, 'PhoneSceneDelegate.swift'), PHONE_SCENE_DELEGATE);
      return cfg;
    },
  ]);

// The new Swift file has to be part of the app target to be compiled.
const withSourceInProject = (config) =>
  withXcodeProject(config, (cfg) => {
    const name = cfg.modRequest.projectName;
    IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath: `${name}/PhoneSceneDelegate.swift`,
      groupName: name,
      project: cfg.modResults,
    });
    return cfg;
  });

module.exports = (config) => withSourceInProject(withSourceFiles(withSceneManifest(withEntitlement(config))));
