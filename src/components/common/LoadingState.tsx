import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { colors } from '../../constants/ui';
import { stateStyles } from './stateStyles';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <View
      accessible
      accessibilityLabel={message}
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      style={stateStyles.container}
    >
      <ActivityIndicator
        accessible={false}
        importantForAccessibility="no"
        color={colors.primary}
      />
      <Text style={stateStyles.message}>{message}</Text>
    </View>
  );
}
