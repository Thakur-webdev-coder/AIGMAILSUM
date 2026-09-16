import React from 'react';
import { Text, View } from 'react-native';
import { AppButton } from '../../../components/common/AppButton';
import { contentStyles } from '../../../components/common/contentStyles';
import { ErrorState } from '../../../components/common/ErrorState';
import { LoadingState } from '../../../components/common/LoadingState';
import type { GmailMessageId } from '../../../types/gmail';
import type { DashboardMetrics, PendingAction } from '../types';
import { DashboardStats } from './DashboardStats';
import { PendingActionsSection } from './PendingActionsSection';

export interface DashboardViewProps {
  metrics?: DashboardMetrics;
  pendingActions?: readonly PendingAction[];
  loading?: boolean;
  refreshing?: boolean;
  errorMessage?: string;
  onRefresh?: () => void;
  onRetry?: () => void;
  onOpenEmail?: (messageId: GmailMessageId) => void;
}

export function DashboardView({
  metrics,
  pendingActions,
  loading = false,
  refreshing = false,
  errorMessage,
  onRefresh,
  onRetry,
  onOpenEmail,
}: DashboardViewProps) {
  const hasDashboardData = Boolean(metrics);
  const initialLoading = loading && !hasDashboardData;
  const initialError = !hasDashboardData && errorMessage;

  return (
    <View style={contentStyles.stack}>
      <Text accessibilityRole="header" style={contentStyles.heading}>
        Dashboard
      </Text>
      {initialLoading ? <LoadingState message="Loading dashboard..." /> : null}
      {initialError ? (
        <ErrorState message={errorMessage} onRetry={onRetry} />
      ) : null}
      {hasDashboardData && errorMessage ? (
        <ErrorState message={errorMessage} onRetry={onRetry} />
      ) : null}
      {hasDashboardData && onRefresh ? (
        <AppButton
          label="Refresh dashboard"
          onPress={onRefresh}
          loading={refreshing}
          variant="compact"
        />
      ) : null}
      {hasDashboardData ? (
        <>
          <DashboardStats values={metrics} />
          <PendingActionsSection
            actions={pendingActions}
            onOpenEmail={onOpenEmail}
          />
        </>
      ) : null}
    </View>
  );
}
