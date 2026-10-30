// Edits the AppDelegate.swift that Expo generates, for CarPlay's window-scene lifecycle.
//
// Before: AppDelegate creates the phone window and starts React Native in it.
// After:  AppDelegate starts React Native with no window (so a launch from CarPlay alone still runs the
//         JavaScript); PhoneSceneDelegate creates the phone window when the phone scene connects.
//
// If the generated file does not look the way this expects (a new Expo version changed it), this THROWS
// so the build fails loudly instead of producing an app that does not open.

const START_BLOCK = /#if os\(iOS\)[^\n]*\n(?:(?!#endif)[\s\S])*?startReactNative\((?:(?!#endif)[\s\S])*?#endif/;
const CLASS_LINE = /(public\s+class\s+AppDelegate\s*:\s*ExpoAppDelegate\s*\{\n)/;

const HEADLESS_START = [
  '    // CarPlay: start React Native here, with no window, so a launch from CarPlay alone still runs the JS.',
  '    // PhoneSceneDelegate creates the phone window and shows the app in it when the phone scene connects.',
  '    factory.rootViewFactory.initializeReactHost(launchOptions: launchOptions)',
].join('\n');

function patchAppDelegate(source) {
  let out = source;

  if (!out.includes('initializeReactHost(launchOptions: launchOptions)')) {
    if (!START_BLOCK.test(out)) {
      throw new Error(
        'withCarPlay: could not find the block that creates the window and calls startReactNative in the generated ' +
        'AppDelegate.swift. The Expo template changed; update plugins/carplay/patchAppDelegate.js.'
      );
    }
    out = out.replace(START_BLOCK, HEADLESS_START);
  }

  // PhoneSceneDelegate hands its window to the app delegate, so keep the property (other Expo modules read it).
  if (!/var\s+window\s*:\s*UIWindow\?/.test(out)) {
    if (!CLASS_LINE.test(out)) {
      throw new Error('withCarPlay: could not find "class AppDelegate: ExpoAppDelegate" in the generated AppDelegate.swift.');
    }
    out = out.replace(CLASS_LINE, '$1  var window: UIWindow?\n');
  }

  return out;
}

module.exports = { patchAppDelegate };
