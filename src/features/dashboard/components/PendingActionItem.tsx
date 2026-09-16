import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { contentStyles } from '../../../components/common/contentStyles';
import { SectionCard } from '../../../components/common/SectionCard';
import { colors, layout, spacing } from '../../../constants/ui';
import type { GmailMessageId } from '../../../types/gmail';

export interface PendingActionItemProps {
  text: string;
  relatedMessageId: GmailMessageId;
  onPress?: (messageId: GmailMessageId) => void;
}

export function PendingActionItem({
  text,
  relatedMessageId,
  onPress,
}: PendingActionItemProps) {
  return (
    <SectionCard>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text}
        accessibilityHint="Opens the related email"
        accessibilityState={{ disabled: !onPress }}
        disabled={!onPress}
        onPress={() => onPress?.(relatedMessageId)}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={contentStyles.body}>{text}</Text>
      </Pressable>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  action: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: layout.cornerRadius,
  },
  pressed: { backgroundColor: colors.muted },
});
