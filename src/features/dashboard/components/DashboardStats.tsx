import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { StatCard } from '../../../components/common/StatCard';
import { spacing } from '../../../constants/ui';
import type { DashboardMetrics } from '../types';

const metrics = [
  { key: 'totalEmails', label: 'Total Emails' },
  { key: 'unreadEmails', label: 'Unread Emails' },
  { key: 'importantEmails', label: 'Important Emails' },
  { key: 'highPriorityEmails', label: 'High-Priority Emails' },
  { key: 'aiAnalyzedEmails', label: 'AI-Analyzed Emails' },
  { key: 'emailsRequiringAction', label: 'Emails Requiring Action' },
] as const satisfies readonly { key: keyof DashboardMetrics; label: string }[];

interface DashboardStatsProps {
  values?: DashboardMetrics;
}

export function DashboardStats({ values }: DashboardStatsProps) {
  const { fontScale } = useWindowDimensions();
  // Flex basis is a preferred width, not a minimum: cards can shrink to any phone.
  const cardSize = { flexBasis: 240 * Math.max(1, fontScale) };

  return (
    <View style={styles.grid}>
      {metrics.map(metric => (
        <View key={metric.key} style={[styles.cell, cardSize]}>
          <StatCard label={metric.label} value={values?.[metric.key] ?? null} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  cell: { flexGrow: 1, flexShrink: 1, minWidth: 0, maxWidth: '100%' },
});
