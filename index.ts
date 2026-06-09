import './src/lib/amplifyConfig'; // must be first — runs Amplify.configure() before any hook modules evaluate
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);