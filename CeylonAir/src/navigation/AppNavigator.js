import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import Dashboard from '../components/Dashboard';
import AirQualityMapView from '../components/MapView';
import ChartsView from '../components/Charts';
import Settings from '../components/Settings';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabNavigator = () => {
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
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        },
        headerShown: false,
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
      primary: '#64B5F6',
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
