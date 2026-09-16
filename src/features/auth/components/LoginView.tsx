import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../../components/common/AppButton';
import { ErrorState } from '../../../components/common/ErrorState';
import { SectionCard } from '../../../components/common/SectionCard';
import { colors, layout, spacing, typography } from '../../../constants/ui';

export interface LoginViewProps {
  onGoogleSignIn?: () => void;
  loading?: boolean;
  errorMessage?: string;
}

export function LoginView({
  onGoogleSignIn,
  loading = false,
  errorMessage,
}: LoginViewProps) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        AI Gmail Summarizer
      </Text>
      <Text style={styles.subtitle}>
        Spend less time reading. Focus on the emails that matter.
      </Text>
      <SectionCard>
        <AppButton
          label="Google Sign In"
          onPress={onGoogleSignIn}
          loading={loading}
        />
        {!loading && errorMessage ? (
          <ErrorState message={errorMessage} onRetry={onGoogleSignIn} />
        ) : null}
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.lg,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
  },
  title: {
    ...typography.heading,
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.secondaryText,
    textAlign: 'center',
    paddingHorizontal: layout.minTouchTarget / 2,
  },
});
