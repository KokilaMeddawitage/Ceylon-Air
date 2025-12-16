import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Dashboard from '../components/Dashboard';
import AirQualityMapView from '../components/MapView';
import ChartsView from '../components/Charts';
import Settings from '../components/Settings';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Charts') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#64B5F6',
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: {
          backgroundColor: '#2A2A2A',
          borderTopWidth: 1,
          borderTopColor: '#404040',
          paddingBottom: Math.max(insets.bottom, 8), // Ensure proper bottom padding
          paddingTop: 8,
          height: 65 + Math.max(insets.bottom, 0), // Add safe area to height
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8, // Android shadow
          shadowColor: '#000', // iOS shadow
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
          marginBottom: 2,
        },
        tabBarHideOnKeyboard: true, // Hide tab bar when keyboard is open
        headerShown: false,
        // Ensure content doesn't get cut off by tab bar
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={Dashboard}
        options={{
          title: 'Dashboard',
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={AirQualityMapView}
        options={{
          title: 'Stations',
        }}
      />
      <Tab.Screen 
        name="Charts" 
        component={ChartsView}
        options={{
          title: 'Charts',
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={Settings}
        options={{
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const darkTheme = {
    dark: true,
    colors: {
      primary: '#3b57d5',
      background: '#121212',
      card: '#2A2A2A',
      text: '#E0E0E0',
      border: '#404040',
      notification: '#FF6B6B',
    },
  };

  return (
    <NavigationContainer theme={darkTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
