import React from 'react';
import { Text, View } from 'react-native';
import { contentStyles } from '../../../components/common/contentStyles';
import type { GmailMessageId } from '../../../types/gmail';
import type { DashboardMetrics, PendingAction } from '../types';
import { DashboardStats } from './DashboardStats';
import { PendingActionsSection } from './PendingActionsSection';

export interface DashboardViewProps {
  metrics?: DashboardMetrics;
  pendingActions?: readonly PendingAction[];
  onOpenEmail?: (messageId: GmailMessageId) => void;
}

export function DashboardView({
  metrics,
  pendingActions,
  onOpenEmail,
}: DashboardViewProps) {
  return (
    <View style={contentStyles.stack}>
      <Text accessibilityRole="header" style={contentStyles.heading}>
        Dashboard
      </Text>
      <DashboardStats values={metrics} />
      <PendingActionsSection
        actions={pendingActions}
        onOpenEmail={onOpenEmail}
      />
    </View>
  );
}
