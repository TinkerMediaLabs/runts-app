import React, { useEffect } from "react";

import { colors } from '@/theme/colors';
import {Dimensions} from 'react-native';

import Icon from '@/components/common/Icon';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '@/screens/primary/home';
import DiscoverScreen from '@/screens/primary/discover';
import PlaylistScreen from '@/screens/primary/playlist';
import PremiumScreen from '@/screens/primary/premium';

import { useApp } from '@/context/AppContext';
import { fontSizes, layout } from '@/theme/tokens';

import { 
        BottomTabParamList, 
        TabOneParamList, 
        TabTwoParamList, 
        TabThreeParamList, 
        TabFourParamList 
      } from '../types/types';

import { usePlayerUI } from '@/context/PlayerUIContext';

const BottomTab = createBottomTabNavigator<BottomTabParamList>();


export default function BottomTabNavigator() {

  const insets = useSafeAreaInsets();

  const { setTabBarHeight } = usePlayerUI();

  const { isPremium } = useApp();

  useEffect(() => {
    const height = layout.tabBarHeight + 10 + insets.bottom;
    setTabBarHeight(height);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setTabBarHeight(layout.tabBarHeight + 20 + insets.bottom);

      return () => {
        setTabBarHeight(0); // 🔥 reset when leaving
      };
    }, [])
  );

  return (
    <BottomTab.Navigator
      initialRouteName="Discover"
      screenOptions={{ 
        tabBarActiveTintColor: colors.textPrimary,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: fontSizes.micro, fontWeight: '600', marginTop: 2 },
        tabBarStyle: {
            paddingTop: 4,
            paddingBottom: (insets.bottom > 0 ? insets.bottom : 6) + 2,
            height: layout.tabBarHeight + insets.bottom,
            backgroundColor: colors.tabBar,
        }
    }}>
      <BottomTab.Screen
  name="Discover"
  component={HomeNavigator}
  options={{
    tabBarLabel: 'For You',
    tabBarIcon: ({ focused, color }) => (
      <Icon name="sparkles" size={24} color={color} weight={focused ? 'fill' : 'light'} />
    ),
    headerShown: false,
  }}
/>
<BottomTab.Screen
  name="Browse"
  component={DiscoverNavigator}
  options={{
    tabBarLabel: 'Discover',
    tabBarIcon: ({ focused, color }) => (
      <Icon name="compass" size={24} color={color} weight={focused ? 'fill' : 'light'} />
    ),
    headerShown: false,
  }}
/>
<BottomTab.Screen
  name="Playlist"
  component={PlaylistNavigator}
  options={{
    tabBarLabel: 'Library',
    tabBarIcon: ({ focused, color }) => (
      <Icon name="library" size={24} color={color} weight={focused ? 'fill' : 'light'} />
    ),
    headerShown: false,
  }}
/>
{!isPremium && (
  <BottomTab.Screen
    name="Premium"
    component={PremiumNavigator}
    options={{
      tabBarLabel: 'Premium',
      tabBarIcon: ({ focused, color }) => (
        <Icon name="crown" size={24} color={color} weight={focused ? 'fill' : 'light'} />
      ),
      headerShown: false,
    }}
  />
)}
      
    </BottomTab.Navigator>
  );
}

const HomeStack = createStackNavigator<TabOneParamList>();

function HomeNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

const DiscoverStack = createStackNavigator<TabTwoParamList>();

function DiscoverNavigator() {
  return (
    <DiscoverStack.Navigator>
      <DiscoverStack.Screen
        name="DiscoverScreen"
        component={DiscoverScreen}
        options={{ headerShown: false }}
      />
    </DiscoverStack.Navigator>
  );
}

const PlaylistStack = createStackNavigator<TabThreeParamList>();

function PlaylistNavigator() {
  return (
    <PlaylistStack.Navigator>
      <PlaylistStack.Screen
        name="PlaylistScreen"
        component={PlaylistScreen}
        options={{ headerShown: false }}
      />
    </PlaylistStack.Navigator>
  );
}

const PremiumStack = createStackNavigator<TabFourParamList>();

function PremiumNavigator() {
  return (
    <PremiumStack.Navigator>
      <PremiumStack.Screen
        name="PremiumScreen"
        component={PremiumScreen}
        options={{ headerShown: false }}
      />
    </PremiumStack.Navigator>
  );
}