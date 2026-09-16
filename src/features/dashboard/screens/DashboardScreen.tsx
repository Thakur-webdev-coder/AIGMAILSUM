import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type {
  AuthenticatedTabParamList,
  RootStackParamList,
} from '../../../app/navigation/types';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { DashboardView } from '../components/DashboardView';
import { useDashboard } from '../useDashboard';

type DashboardNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<AuthenticatedTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function DashboardScreen() {
  const dashboard = useDashboard();
  const navigation = useNavigation<DashboardNavigation>();
  return (
    <ScreenContainer safeAreaEdges={['left', 'right']}>
      <DashboardView
        {...dashboard}
        onOpenEmail={emailId => {
          navigation.navigate('EmailDetails', { emailId });
        }}
      />
    </ScreenContainer>
  );
}
