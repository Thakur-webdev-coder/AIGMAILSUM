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
import { InboxView } from '../components/InboxView';
import { useInbox } from '../useInbox';

type InboxNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<AuthenticatedTabParamList, 'Inbox'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function InboxScreen() {
  const navigation = useNavigation<InboxNavigation>();
  const inbox = useInbox();
  return (
    <ScreenContainer scrollable={false} safeAreaEdges={['left', 'right']}>
      <InboxView
        {...inbox}
        onOpenEmail={emailId => {
          navigation.navigate('EmailDetails', { emailId });
        }}
      />
    </ScreenContainer>
  );
}
