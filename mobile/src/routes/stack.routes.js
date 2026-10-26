import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

import LoginPage from '../pages/login';
import RegisterPage from '../pages/register';
import TabRoutes from './tab.routes';
import ProfilePage from '../pages/profile';
import { AuthContext } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

export default function Routes() {
  // A sessão (token validado + user) é carregada no AuthProvider
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // As telas mudam conforme o user: no signIn/signOut (ou 401) o stack é trocado inteiro,
  // então nenhuma tela logada fica montada com o user anterior.
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
        {user ? (
          <>
            <Stack.Screen name="MainApp" component={TabRoutes}/>
            <Stack.Screen name="Profile" component={ProfilePage}/>
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginPage}/>
            <Stack.Screen name="Register" component={RegisterPage}/>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
