import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../../features/dashboard/screens/DashboardScreen';
import { InboxScreen } from '../../features/inbox/screens/InboxScreen';
import type { AuthenticatedTabParamList } from './types';
import { LogoutButton } from '../../features/auth/components/LogoutButton';
import { colors, spacing, typography } from '../../constants/ui';

const renderLogout = () => <LogoutButton />;

const Tab = createBottomTabNavigator<AuthenticatedTabParamList>();

interface TabLabelProps {
  focused: boolean;
  color: string;
  position: 'beside-icon' | 'below-icon';
  children: string;
}

function TabLabel({ color, focused, children }: TabLabelProps) {
  return (
    <Text
      numberOfLines={1}
      style={[
        styles.tabLabel,
        { color },
        focused && styles.activeTabLabel,
      ]}
    >
      {children}
    </Text>
  );
}

export function AuthenticatedTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerRight: renderLogout,
        headerRightContainerStyle: { paddingRight: spacing.md },
        headerTitleStyle: { ...typography.label, color: colors.text },
        tabBarIcon: () => null,
        tabBarLabel: TabLabel,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text,
        tabBarActiveBackgroundColor: '#EFF6FF',
        tabBarStyle: {
          minHeight: 60,
          paddingTop: spacing.xs,
          paddingBottom: spacing.xs,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.muted,
          backgroundColor: colors.surface,
          elevation: 2,
          shadowColor: colors.text,
          shadowOpacity: 0.05,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -1 },
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          marginHorizontal: spacing.sm,
          marginVertical: spacing.xs,
          borderRadius: 10,
        },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textAlign: 'center',
  },
  activeTabLabel: {
    fontWeight: '700',
  },
});
