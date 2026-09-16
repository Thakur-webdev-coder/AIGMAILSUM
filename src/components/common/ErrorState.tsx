import React from 'react';
import { Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { stateStyles } from './stateStyles';

interface ErrorStateProps {
  /** A user-facing message, not a raw exception or service response. */
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={stateStyles.container}>
      <Text
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[stateStyles.message, stateStyles.error]}
      >
        {message}
      </Text>
      {onRetry ? <AppButton label="Try again" onPress={onRetry} /> : null}
    </View>
  );
}
