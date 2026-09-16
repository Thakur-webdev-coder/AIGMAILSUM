import React from 'react';
import { Text, View } from 'react-native';
import { contentStyles } from './contentStyles';
import { SectionCard } from './SectionCard';

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
        style={contentStyles.group}
      >
        <Text style={contentStyles.label}>{label}</Text>
        <Text style={contentStyles.heading}>{displayValue}</Text>
      </View>
    </SectionCard>
  );
}
