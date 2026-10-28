import './src/lib/amplifyConfig'; // must be first — runs Amplify.configure() before any hook modules evaluate
import { registerRootComponent } from 'expo';
import App from './App';

// Release builds keep warnings and errors (Sentry reads them) but drop routine logging.
if (!__DEV__) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

registerRootComponent(App);