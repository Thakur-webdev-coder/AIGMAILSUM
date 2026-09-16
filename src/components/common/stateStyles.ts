import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../constants/ui';

export const stateStyles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  title: {
    ...typography.heading,
    color: colors.text,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.secondaryText,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  error: { color: colors.error },
});
