import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../constants/ui';

export const contentStyles = StyleSheet.create({
  stack: { gap: spacing.lg },
  group: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  heading: { ...typography.heading, color: colors.text },
  label: { ...typography.label, color: colors.text },
  body: { ...typography.body, color: colors.text },
  secondary: { ...typography.body, color: colors.secondaryText },
});
