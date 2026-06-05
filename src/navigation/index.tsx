import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ColorSchemeName } from 'react-native';
import 'react-native-gesture-handler';

import { navigationRef } from './RootNavigator';
import { RootStackParamList } from '../types/types';
import BottomTabNavigator from './TabNavigator';
import { useApp } from '../context/AppContext';

//screens
import StoryScreen from '../screens/global/storyDetails';
import UserScreen from '../screens/primary/profile';
import AboutScreen from '../screens/settings/about';
import AccountScreen from '../screens/settings/account';
import TagHomeScreen from '../screens/discover/tagHome';
import AuthorDetailsScreen from '../screens/global/authorDetails';
import BrowseByTitleScreen from '../screens/discover/browswByTitle';
import AuthorFollowingScreen from '../screens/global/authorFollowing';
import InProgressScreen from '@/screens/settings/inProgress';
import HistoryScreen from '@/screens/settings/history';
import AppSettings from '../screens/settings/appSettings';
import SearchScreen from '../screens/discover/search';
import SignUpScreen from '../screens/auth/signUp';
import SignInScreen from '../screens/auth/signIn';
import EmailSignIn from '../screens/auth/emailSignIn';
import ForgotPasswordScreen from '../screens/auth/forgotPassword';
import ForgotPasswordConScreen from '../screens/auth/forgotPasswordConfirmation';
import ConfirmEmailScreen from '../screens/auth/confirmEmail';
import WelcomePreferencesScreen from '../screens/auth/welcomePreferences';
import Welcome from '../screens/auth/welcome';
import WaitingScreen from '../screens/auth/waiting';

export default function Navigation({ }: { colorScheme: ColorSchemeName }) {
  return (
    <NavigationContainer theme={DarkTheme} ref={navigationRef}>
      <RootNavigator />
    </NavigationContainer>
  );
}

const forFade = ({ current }: any) => ({
  cardStyle: {
    opacity: current.progress,
  },
});

const Stack = createStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { isAuthenticated, isLoading, isNewUser } = useApp();

  if (isLoading) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Waiting" component={WaitingScreen} />
      </Stack.Navigator>
    );
  }

  // Authenticated new user → onboarding flow
  if (isAuthenticated && isNewUser) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={Welcome} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="WelcomePref" component={WelcomePreferencesScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="Root" component={BottomTabNavigator} options={{ cardStyleInterpolator: forFade }} />
      </Stack.Navigator>
    );
  }

  // Authenticated returning user → home
  if (isAuthenticated && !isNewUser) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Root" component={BottomTabNavigator} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="StoryScreen" component={StoryScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="UserScreen" component={UserScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="AboutScreen" component={AboutScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="AccountScreen" component={AccountScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="TagHomeScreen" component={TagHomeScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="AuthorDetails" component={AuthorDetailsScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="BrowseByTitle" component={BrowseByTitleScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="InProgressScreen" component={InProgressScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="HistoryScreen" component={HistoryScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="AppSettingsScreen" component={AppSettings} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="AuthorFollowing" component={AuthorFollowingScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="SearchScreen" component={SearchScreen} options={{ cardStyleInterpolator: forFade }} />
      </Stack.Navigator>
    );
  }

  // Not authenticated → auth flow
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="SignIn"
    >
      <Stack.Screen name="SignIn" component={SignInScreen} options={{ cardStyleInterpolator: forFade }} />
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ cardStyleInterpolator: forFade }} />
      <Stack.Screen name="EmailSignIn" component={EmailSignIn} options={{ cardStyleInterpolator: forFade }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ cardStyleInterpolator: forFade }} />
      <Stack.Screen name="ForgotPasswordCon" component={ForgotPasswordConScreen} options={{ cardStyleInterpolator: forFade }} />
      <Stack.Screen name="ConfirmEmail" component={ConfirmEmailScreen} options={{ cardStyleInterpolator: forFade }} />
    </Stack.Navigator>
  );
}