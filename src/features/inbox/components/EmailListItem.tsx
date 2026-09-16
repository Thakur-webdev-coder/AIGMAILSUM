import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../../components/common/AppButton';
import { Badge } from '../../../components/common/Badge';
import { SectionCard } from '../../../components/common/SectionCard';
import { colors, layout, spacing, typography } from '../../../constants/ui';
import type { EmailActions, InboxEmail } from '../types';

export interface EmailListItemProps extends EmailActions {
  email: InboxEmail;
}

export function EmailListItem({
  email,
  onOpenEmail,
  onMarkRead,
}: EmailListItemProps) {
  const { id, sender, subject, preview, dateTimeLabel, isRead } = email;

  return (
    <SectionCard>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${
          isRead ? 'Read' : 'Unread'
        } email from ${sender}. ${subject}. ${dateTimeLabel}. ${preview}`}
        accessibilityHint="Opens email details"
        accessibilityState={{ disabled: !onOpenEmail }}
        disabled={!onOpenEmail}
        onPress={() => onOpenEmail?.(id)}
        style={({ pressed }) => [styles.content, pressed && styles.pressed]}
      >
        <View style={styles.metadata}>
          <Text
            numberOfLines={2}
            style={[styles.sender, !isRead && styles.unread]}
          >
            {sender}
          </Text>
          <Text style={styles.date}>{dateTimeLabel}</Text>
        </View>
        <Text
          numberOfLines={2}
          style={[styles.subject, !isRead && styles.unread]}
        >
          {subject}
        </Text>
        <Text numberOfLines={3} style={styles.preview}>
          {preview}
        </Text>
        <Badge label={isRead ? 'Read' : 'Unread'} />
      </Pressable>
      <AppButton
        label={isRead ? 'Mark unread' : 'Mark read'}
        onPress={onMarkRead ? () => onMarkRead(id, !isRead) : undefined}
      />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  content: { minHeight: layout.minTouchTarget, gap: spacing.sm },
  pressed: { opacity: 0.7 },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sender: {
    ...typography.body,
    color: colors.text,
    flexGrow: 1,
    flexShrink: 1,
  },
  date: { ...typography.caption, color: colors.secondaryText, flexShrink: 1 },
  subject: { ...typography.body, color: colors.text },
  preview: { ...typography.body, color: colors.secondaryText },
  unread: { fontWeight: '700' },
});
