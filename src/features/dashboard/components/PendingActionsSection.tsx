import React from 'react';
import { Text, View } from 'react-native';
import { contentStyles } from '../../../components/common/contentStyles';
import { EmptyState } from '../../../components/common/EmptyState';
import type { GmailMessageId } from '../../../types/gmail';
import type { PendingAction } from '../types';
import { PendingActionItem } from './PendingActionItem';

export interface PendingActionsSectionProps {
  actions?: readonly PendingAction[];
  onOpenEmail?: (messageId: GmailMessageId) => void;
}

export function PendingActionsSection({
  actions,
  onOpenEmail,
}: PendingActionsSectionProps) {
  return (
    <View style={contentStyles.stack}>
      <Text accessibilityRole="header" style={contentStyles.heading}>
        Pending Actions
      </Text>
      {actions && actions.length > 0 ? (
        actions.map(action => (
          <PendingActionItem
            key={action.id}
            text={action.text}
            relatedMessageId={action.relatedMessageId}
            onPress={onOpenEmail}
          />
        ))
      ) : (
        <EmptyState
          title={
            actions ? 'No pending actions' : 'Pending actions not available'
          }
          message={
            actions
              ? 'There are no actions to display.'
              : 'Actions will appear here when available.'
          }
        />
      )}
    </View>
  );
}
