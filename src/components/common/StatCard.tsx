import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SectionCard } from './SectionCard';
import { colors, spacing, typography } from '../../constants/ui';

export interface StatCardProps {
  label: string;
  value: number | null;
}

export function StatCard({ label, value }: StatCardProps) {
  const displayValue = value === null ? 'Not available' : String(value);

  return (
    <SectionCard>
      <View
        accessible
        accessibilityLabel={`${label}: ${displayValue}`}
        style={styles.content}
      >
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{displayValue}</Text>
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xs, minHeight: 68, justifyContent: 'center' },
  label: { ...typography.caption, color: colors.secondaryText },
  value: { ...typography.heading, color: colors.text },
});
