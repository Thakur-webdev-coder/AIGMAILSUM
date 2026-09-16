import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../../components/common/Badge';
import { contentStyles } from '../../../components/common/contentStyles';
import { SectionCard } from '../../../components/common/SectionCard';
import { spacing } from '../../../constants/ui';
import type { EmailDetails } from '../types';

interface EmailHeaderProps {
  email: EmailDetails;
}

export function EmailHeader({ email }: EmailHeaderProps) {
  return (
    <SectionCard>
      <Text selectable accessibilityRole="header" style={contentStyles.heading}>
        {email.subject}
      </Text>
      <View style={styles.meta}>
        <Text selectable style={contentStyles.body}>
          From: {email.sender}
        </Text>
        <Text selectable style={contentStyles.body}>
          To: {email.recipients.join(', ')}
        </Text>
        <Text selectable style={contentStyles.secondary}>
          {email.dateTimeLabel}
        </Text>
      </View>
      <View style={styles.badges}>
        <Badge label={email.isRead ? 'Read' : 'Unread'} />
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  meta: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap' },
});
