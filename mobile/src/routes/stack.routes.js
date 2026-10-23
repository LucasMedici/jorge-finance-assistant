import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

import LoginPage from '../pages/login';
import RegisterPage from '../pages/register';
import TabRoutes from './tab.routes';
import ProfilePage from '../pages/profile';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isTokenValid } from '../global/isTokenValid';

const Stack = createNativeStackNavigator();

export default function Routes() {
  const [loading, setLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  useEffect(() => {
    const checkUserToken = async () => {
      const token = await AsyncStorage.getItem('userToken');

      if(!token) {
        setUserToken(false);
        setLoading(false);
        return
      }

      const validToken = isTokenValid(token);

      setUserToken(validToken);
      setLoading(false);
    };
    checkUserToken();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={userToken ? "MainApp" : "Login"} screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Screen name="Login" component={LoginPage}/>
        <Stack.Screen name="Register" component={RegisterPage}/>
        <Stack.Screen name="MainApp" component={TabRoutes}/>
        <Stack.Screen name="Profile" component={ProfilePage}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
