import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { contentStyles } from '../../../components/common/contentStyles';
import { spacing } from '../../../constants/ui';

interface AnalysisListProps {
  title: string;
  items: readonly string[];
}

export function AnalysisList({ title, items }: AnalysisListProps) {
  return (
    <View style={contentStyles.group}>
      <Text accessibilityRole="header" style={contentStyles.label}>
        {title}
      </Text>
      {items.length === 0 ? (
        <Text style={contentStyles.secondary}>None provided.</Text>
      ) : (
        items.map((item, index) => (
          <View key={index} style={styles.row}>
            <Text accessible={false} style={styles.bullet}>
              -
            </Text>
            <Text selectable style={[contentStyles.body, styles.item]}>
              {item}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bullet: { ...contentStyles.secondary, width: spacing.md },
  item: { flex: 1, minWidth: 0 },
});
