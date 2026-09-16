import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { EmailDetailsScreen } from '../../features/emailDetails/screens/EmailDetailsScreen';
import { useAppSelector } from '../../hooks/useAppSelector';
import { AuthenticatedTabs } from './AuthenticatedTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {isAuthenticated ? (
          <Stack.Group>
            <Stack.Screen
              name="AuthenticatedTabs"
              component={AuthenticatedTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EmailDetails"
              component={EmailDetailsScreen}
              options={{ title: 'Email Details' }}
            />
          </Stack.Group>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
