import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, layout, spacing, typography } from '../../constants/ui';

interface BadgeProps {
  label: string;
}

export function Badge({ label }: BadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexShrink: 1,
    maxWidth: '100%',
    borderRadius: layout.cornerRadius,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.muted,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    flexShrink: 1,
  },
});
