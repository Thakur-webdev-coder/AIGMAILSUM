import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, layout, spacing, typography } from '../../constants/ui';

interface AppButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  variant?: 'primary' | 'compact';
}

export function AppButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  accessibilityHint,
  variant = 'primary',
}: AppButtonProps) {
  const unavailable = disabled || loading || !onPress;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'compact' && styles.compact,
        pressed && styles.pressed,
        unavailable && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          accessible={false}
          importantForAccessibility="no"
          color={colors.secondaryText}
        />
      ) : null}
      <Text style={[styles.label, unavailable && styles.disabledLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    maxWidth: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: layout.cornerRadius,
    backgroundColor: colors.primary,
  },
  compact: {
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: { backgroundColor: colors.primaryPressed },
  disabled: { backgroundColor: colors.muted },
  label: {
    ...typography.label,
    color: colors.onPrimary,
    flexShrink: 1,
    textAlign: 'center',
  },
  disabledLabel: { color: colors.secondaryText },
});
