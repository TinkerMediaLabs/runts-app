// Source of PhoneSceneDelegate.swift, written into the iOS project by withCarPlay.
//
// With scenes, iOS no longer tells the app delegate about opened links, so this scene forwards them
// (universal links, runts:// sign-in callbacks) to the app delegate's existing handlers.
const PHONE_SCENE_DELEGATE = `import UIKit
import Expo
import React

// The phone's window scene (added for CarPlay). React Native is started in AppDelegate so that a launch from
// CarPlay alone still runs the JavaScript; this scene creates the window and shows the app in it.
class PhoneSceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? ExpoAppDelegate,
          let factory = appDelegate.factory else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    (UIApplication.shared.delegate as? AppDelegate)?.window = window
    factory.startReactNative(withModuleName: "main", in: window, launchOptions: nil)
    window.makeKeyAndVisible()

    // A link that launched the app arrives here instead of in the app delegate.
    for context in connectionOptions.urlContexts { forward(url: context.url) }
    if let activity = connectionOptions.userActivities.first { forward(activity: activity) }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts { forward(url: context.url) }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    forward(activity: userActivity)
  }

  private func forward(url: URL) {
    _ = UIApplication.shared.delegate?.application?(UIApplication.shared, open: url, options: [:])
  }

  private func forward(activity: NSUserActivity) {
    _ = UIApplication.shared.delegate?.application?(UIApplication.shared, continue: activity, restorationHandler: { _ in })
  }
}
`;

module.exports = { PHONE_SCENE_DELEGATE };
