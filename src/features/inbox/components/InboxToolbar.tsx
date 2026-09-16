import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, layout, spacing, typography } from '../../../constants/ui';
import { inboxFilters } from '../types';
import type { InboxFilter } from '../types';

interface InboxToolbarProps {
  searchQuery: string;
  selectedFilter: InboxFilter;
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: InboxFilter) => void;
}

export function InboxToolbar({
  searchQuery,
  selectedFilter,
  onSearchChange,
  onFilterChange,
}: InboxToolbarProps) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Inbox
      </Text>
      <TextInput
        accessibilityLabel="Search emails"
        placeholder="Search emails"
        placeholderTextColor={colors.secondaryText}
        value={searchQuery}
        onChangeText={onSearchChange}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.search}
      />
      <View style={styles.filters}>
        {inboxFilters.map(filter => {
          const selected = filter === selectedFilter;
          return (
            <Pressable
              key={filter}
              accessibilityRole="button"
              accessibilityLabel={filter}
              accessibilityState={{ selected }}
              onPress={() => onFilterChange(filter)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.selected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[styles.chipLabel, selected && styles.selectedLabel]}
              >
                {filter}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingBottom: spacing.lg },
  title: { ...typography.heading, color: colors.text },
  search: {
    ...typography.body,
    color: colors.text,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.cornerRadius,
    backgroundColor: colors.surface,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: layout.minTouchTarget,
    maxWidth: '100%',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: layout.cornerRadius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.8 },
  chipLabel: { ...typography.caption, color: colors.text },
  selectedLabel: { color: colors.onPrimary },
});
