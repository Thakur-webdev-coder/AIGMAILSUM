import React from 'react';
import { Text, View } from 'react-native';
import { stateStyles } from './stateStyles';

interface EmptyStateProps {
  title: string;
  message?: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={stateStyles.container}>
      <Text accessibilityRole="header" style={stateStyles.title}>
        {title}
      </Text>
      {message ? <Text style={stateStyles.message}>{message}</Text> : null}
    </View>
  );
}
