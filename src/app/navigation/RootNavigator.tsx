import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { EmailDetailsScreen } from '../../features/emailDetails/screens/EmailDetailsScreen';
import { useAppSelector } from '../../hooks/useAppSelector';
import { AuthenticatedTabs } from './AuthenticatedTabs';
import type { RootStackParamList } from './types';
import { useAuthSession } from '../../features/auth/useAuthSession';
import { LoadingState } from '../../components/common/LoadingState';
import { ScreenContainer } from '../../components/common/ScreenContainer';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  useAuthSession();
  const initializing = useAppSelector(state => state.auth.initializing);
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  if (initializing) {
    return (
      <ScreenContainer>
        <LoadingState message="Restoring session..." />
      </ScreenContainer>
    );
  }

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
