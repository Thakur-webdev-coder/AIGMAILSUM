import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../../features/dashboard/screens/DashboardScreen';
import { InboxScreen } from '../../features/inbox/screens/InboxScreen';
import type { AuthenticatedTabParamList } from './types';

const Tab = createBottomTabNavigator<AuthenticatedTabParamList>();

export function AuthenticatedTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarIcon: () => null }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
    </Tab.Navigator>
  );
}
