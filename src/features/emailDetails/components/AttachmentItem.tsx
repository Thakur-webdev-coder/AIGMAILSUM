import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../../components/common/AppButton';
import { contentStyles } from '../../../components/common/contentStyles';
import { colors, spacing } from '../../../constants/ui';
import type { EmailAttachment } from '../types';

export interface AttachmentItemProps {
  attachment: EmailAttachment;
  onOpen?: (attachmentId: string) => void;
}

export function AttachmentItem({ attachment, onOpen }: AttachmentItemProps) {
  return (
    <View style={styles.item}>
      <Text selectable style={contentStyles.label}>
        {attachment.filename}
      </Text>
      <Text selectable style={contentStyles.secondary}>
        {attachment.mimeType}
      </Text>
      {attachment.sizeLabel ? (
        <Text style={contentStyles.secondary}>{attachment.sizeLabel}</Text>
      ) : null}
      {onOpen ? (
        <AppButton
          label="Open attachment"
          accessibilityHint={attachment.filename}
          onPress={() => onOpen(attachment.id)}
          variant="compact"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
