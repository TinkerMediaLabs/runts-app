// eslint-disable-next-line @typescript-eslint/no-require-imports
const { patchAppDelegate } = require('../../plugins/carplay/patchAppDelegate');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PHONE_SCENE_DELEGATE } = require('../../plugins/carplay/phoneSceneDelegate');

// What Expo's template generates (SDK 54), trimmed to the parts the plugin touches.
const TEMPLATE = `import Expo
import React
import ReactAppDependencyProvider

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
`;

describe('patchAppDelegate', () => {
  it('starts React Native without a window and drops the window creation', () => {
    const out = patchAppDelegate(TEMPLATE);
    expect(out).toContain('factory.rootViewFactory.initializeReactHost(launchOptions: launchOptions)');
    expect(out).not.toContain('startReactNative(');
    expect(out).not.toContain('UIWindow(frame');
    expect(out).not.toContain('#if os(iOS)');
  });

  it('keeps the rest of the file intact', () => {
    const out = patchAppDelegate(TEMPLATE);
    expect(out).toContain('bindReactNativeFactory(factory)');
    expect(out).toContain('return super.application(application, didFinishLaunchingWithOptions: launchOptions)');
    expect(out).toContain('var window: UIWindow?');
  });

  it('is safe to run twice', () => {
    const once = patchAppDelegate(TEMPLATE);
    expect(patchAppDelegate(once)).toBe(once);
  });

  it('adds the window property when the template has none', () => {
    const out = patchAppDelegate(TEMPLATE.replace('  var window: UIWindow?\n\n', ''));
    expect(out).toContain('var window: UIWindow?');
  });

  it('fails loudly when the template is not recognised', () => {
    expect(() => patchAppDelegate('public class AppDelegate: ExpoAppDelegate {\n}\n')).toThrow('withCarPlay');
  });

  it('does not swallow earlier #if blocks', () => {
    const withOther = TEMPLATE.replace('  var window: UIWindow?', '#if os(iOS)\n  let other = 1\n#endif\n  var window: UIWindow?');
    const out = patchAppDelegate(withOther);
    expect(out).toContain('let other = 1');
  });
});

describe('PhoneSceneDelegate source', () => {
  it('starts React Native in its own window and forwards links', () => {
    expect(PHONE_SCENE_DELEGATE).toContain('class PhoneSceneDelegate: UIResponder, UIWindowSceneDelegate');
    expect(PHONE_SCENE_DELEGATE).toContain('factory.startReactNative(withModuleName: "main", in: window, launchOptions: nil)');
    expect(PHONE_SCENE_DELEGATE).toContain('openURLContexts');
    expect(PHONE_SCENE_DELEGATE).toContain('continue userActivity');
  });
});
