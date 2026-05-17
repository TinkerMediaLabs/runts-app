import React, { useEffect } from "react";

import {Dimensions} from 'react-native';

import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Octicons } from '@react-native-vector-icons/octicons';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '@/screens/primary/home';
import DiscoverScreen from '@/screens/primary/discover';
import PlaylistScreen from '@/screens/primary/playlist';
import PremiumScreen from '@/screens/primary/premium';

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

  useEffect(() => {
    const height = 60 + insets.bottom;
    setTabBarHeight(height);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setTabBarHeight(70 + insets.bottom);

      return () => {
        setTabBarHeight(0); // 🔥 reset when leaving
      };
    }, [])
  );

  return (
    <BottomTab.Navigator
      initialRouteName="Discover"
      screenOptions={{ 
          tabBarActiveTintColor: '#fff',
          tabBarStyle: {
            paddingBottom: insets.bottom,
            height: 60 + insets.bottom,
        }
          }}>
      <BottomTab.Screen
        name="Discover"
        component={HomeNavigator}
        options={{
          tabBarIcon: ({ color }) => <Octicons name='telescope-fill' size={25} style={{ marginBottom: -4 }} color={color} />,
          headerShown: false
        }}
      />
      <BottomTab.Screen
        name="Browse"
        component={DiscoverNavigator}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name='library-sharp' size={25} style={{ marginBottom: -4 }} color={color} />,
          headerShown: false,
        }}
      />
      <BottomTab.Screen
        name="Playlist"
        component={PlaylistNavigator}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name='disc' size={25} style={{ marginBottom: -4 }} color={color} />,
          headerShown: false,
        }}
      />
        <BottomTab.Screen
          name="Premium"
          component={PremiumNavigator}
          options={{
            tabBarIcon: ({ color }) => <Ionicons name='star' size={25} style={{ marginBottom: -4 }} color={color} />,
            headerShown: false,
          }}
        />
      
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