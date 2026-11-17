import { useEffect, useRef } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ColorSchemeName } from 'react-native';
import 'react-native-gesture-handler';

import { navigationRef } from './RootNavigator';
import { setTipsRoute } from '../tips/tipsStore';
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
import AllSubgenresScreen from '../screens/discover/allSubgenres';
import AuthorFollowingScreen from '../screens/global/authorFollowing';
import InProgressScreen from '@/screens/settings/inProgress';
import EditGenresScreen from '@/screens/settings/editGenres';
import HistoryScreen from '@/screens/settings/history';
import BlockedUsersScreen from '@/screens/settings/blockedUsers';
import GenreNotificationsScreen from '../screens/settings/genreNotifications';
import AppSettings from '../screens/settings/appSettings';
import SearchScreen from '../screens/discover/search';
import SignUpScreen from '../screens/auth/signUp';
import SignInScreen from '../screens/auth/signIn';
import EmailSignIn from '../screens/auth/emailSignIn';
import ForgotPasswordScreen from '../screens/auth/forgotPassword';
import ForgotPasswordConScreen from '../screens/auth/forgotPasswordConfirmation';
import ConfirmEmailScreen from '../screens/auth/confirmEmail';
import WelcomePreferencesScreen from '../screens/auth/welcomePreferences';
import WelcomeTasteScreen from '../screens/auth/welcomeTaste';
import Welcome from '../screens/auth/welcome';
import WaitingScreen from '../screens/auth/waiting';
import EroticHomeScreen from '../screens/erotic/EroticHomeScreen';
import ContentBlocked from '../screens/erotic/ContentBlocked';

export default function Navigation({ }: { colorScheme: ColorSchemeName }) {
  return (
    <NavigationContainer
      theme={DarkTheme}
      ref={navigationRef}
      onReady={() => setTipsRoute(navigationRef.current?.getCurrentRoute()?.name)}
      onStateChange={() => setTipsRoute(navigationRef.current?.getCurrentRoute()?.name)}
    >
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
  const { isAuthenticated, isLoading, isNewUser, isGuest } = useApp();

  // Starting guest mode begins at Home. The guest stack includes the Sign In screen (a locked action leads there),
  // so without this the navigator would keep the Sign In route the person tapped "Continue without signing in" on.
  const inGuestMode = isGuest && !isAuthenticated;
  const wasInGuestMode = useRef(false);
  useEffect(() => {
    if (inGuestMode && !wasInGuestMode.current) {
      navigationRef.current?.resetRoot({ index: 0, routes: [{ name: 'Root' }] });
    }
    wasInGuestMode.current = inGuestMode;
  }, [inGuestMode]);

  if (isLoading) {
    return (
      <Stack.Navigator key="loading" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Waiting" component={WaitingScreen} />
      </Stack.Navigator>
    );
  }

  // Authenticated new user → onboarding flow
  if (isAuthenticated && isNewUser) {
    return (
      <Stack.Navigator key="newUser" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={Welcome} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="WelcomePref" component={WelcomePreferencesScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="WelcomeTaste" component={WelcomeTasteScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="Root" component={BottomTabNavigator} options={{ cardStyleInterpolator: forFade }} />
      </Stack.Navigator>
    );
  }

  // Authenticated returning user → home
  if (isAuthenticated && !isNewUser) {
    return (
      <Stack.Navigator key="authed" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Root" component={BottomTabNavigator} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="StoryScreen" component={StoryScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="UserScreen" component={UserScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="AboutScreen" component={AboutScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="AccountScreen" component={AccountScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="TagHomeScreen" component={TagHomeScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="AuthorDetails" component={AuthorDetailsScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="BrowseByTitle" component={BrowseByTitleScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="AllSubgenres" component={AllSubgenresScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="InProgressScreen" component={InProgressScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="HistoryScreen" component={HistoryScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="EditGenresScreen" component={EditGenresScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="BlockedUsersScreen" component={BlockedUsersScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="GenreNotificationsScreen" component={GenreNotificationsScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="AppSettingsScreen" component={AppSettings} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="AuthorFollowing" component={AuthorFollowingScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="SearchScreen" component={SearchScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="EroticHome"      component={EroticHomeScreen} />
        <Stack.Screen name="ContentBlocked"  component={ContentBlocked}   />
      </Stack.Navigator>
    );
  }

  // Guest (browsing without an account): the browsing screens, plus the sign-in and sign-up screens a locked action leads to.
  if (isGuest && !isAuthenticated) {
    return (
      <Stack.Navigator key="guest" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Root" component={BottomTabNavigator} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="StoryScreen" component={StoryScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="TagHomeScreen" component={TagHomeScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="AuthorDetails" component={AuthorDetailsScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="BrowseByTitle" component={BrowseByTitleScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="AllSubgenres" component={AllSubgenresScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="SearchScreen" component={SearchScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="AboutScreen" component={AboutScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="ContentBlocked" component={ContentBlocked} />
        <Stack.Screen name="SignIn" component={SignInScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="EmailSignIn" component={EmailSignIn} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="ForgotPasswordCon" component={ForgotPasswordConScreen} options={{ cardStyleInterpolator: forFade }} />
        <Stack.Screen name="ConfirmEmail" component={ConfirmEmailScreen} options={{ cardStyleInterpolator: forFade }} />
      </Stack.Navigator>
    );
  }

  // Not authenticated → auth flow
  return (
    <Stack.Navigator key="auth"
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