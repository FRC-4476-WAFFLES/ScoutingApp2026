import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/Home';
import SettingsScreen from '../screens/Settings';
import PregameScreen from '../screens/Pregame';
import MatchScreen from '../screens/Match';
import TeamComparisonScreen from '../screens/TeamComparison';
import QRCodeScreen from '../screens/QRCode';

const Stack = createNativeStackNavigator();

const RootStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={"Home"}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Pregame" component={PregameScreen} />
      <Stack.Screen name="Match" component={MatchScreen} />
      <Stack.Screen name="TeamComparison" component={TeamComparisonScreen} />
      <Stack.Screen name="QRCode" component={QRCodeScreen} />
    </Stack.Navigator>
  );
}

const AppStack = () => {
  return (
    <NavigationContainer>
      <RootStack />
    </NavigationContainer>
  );
}

export default AppStack;
