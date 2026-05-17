// import * as Sentry from '@sentry/react-native';

// Sentry.init({
//   dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
//   tracesSampleRate: 0.2,
//   enableAutoPerformanceTracing: true,
// });

// export default Sentry;


//if using expo public environment variable, make sure to add it to the .env file and also to the app.json file under "expo.extra" section. For example:
// .env
// EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

// app.json
// {
//   "expo": {
//     "extra": {
//       "sentryDsn": process.env.EXPO_PUBLIC_SENTRY_DSN
//     }
//   }
// }

//DSN: https://07b6a45cce22f1b4d31605d28bb8d648@o4511289153617920.ingest.us.sentry.io/4511289168822272

//Add error boundary to the root component of your app to catch unhandled errors and report them to Sentry. For example:
// import * as Sentry from '@sentry/react-native';

//const ErrorBoundary = Sentry.wrap;

//export default ErrorBoundary(App);

// Day 6 — Add User Context After Auth

// Very important once Cognito exists.

// After login success:

// Sentry.setUser({
//  id: user.id,
//  email: user.email,
//  username: user.displayName
// });

// Now crashes tie to users.

// When logging out:

// Sentry.setUser(null);

// Clear context.
//===============
// Add tags

// Helpful for filtering:

// Sentry.setTag('environment','development');
// Sentry.setTag('feature','audio-player');

// Useful later.


// Capture handled errors intentionally

// Bad:

// catch(e){
//  console.log(e)
// }

// Better:

// catch(e){
//  Sentry.captureException(e)
// }
