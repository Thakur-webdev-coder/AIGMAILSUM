import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../../components/common/AppButton';
import { contentStyles } from '../../../components/common/contentStyles';
import { EmptyState } from '../../../components/common/EmptyState';
import { ErrorState } from '../../../components/common/ErrorState';
import { LoadingState } from '../../../components/common/LoadingState';
import { SectionCard } from '../../../components/common/SectionCard';
import { spacing } from '../../../constants/ui';
import type { EmailAnalysis } from '../../../types/email';
import { AIAnalysisView } from '../../aiAnalysis/components/AIAnalysisView';
import type { EmailDetails } from '../types';
import { AttachmentItem } from './AttachmentItem';
import { EmailHeader } from './EmailHeader';

export interface EmailDetailsViewProps {
  email?: EmailDetails;
  loading?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onMarkRead?: (emailId: string, isRead: boolean) => void;
  markingRead?: boolean;
  onSummarize?: (emailId: string) => void;
  onOpenAttachment?: (attachmentId: string) => void;
  analysis?: EmailAnalysis;
  analysisComplete?: boolean;
  analyzing?: boolean;
  analysisErrorMessage?: string;
}

export function EmailDetailsView({
  email,
  loading = false,
  errorMessage,
  onRetry,
  onMarkRead,
  markingRead = false,
  onSummarize,
  onOpenAttachment,
  analysis,
  analysisComplete = false,
  analyzing = false,
  analysisErrorMessage,
}: EmailDetailsViewProps) {
  if (!email) {
    if (loading) {
      return <LoadingState message="Loading email..." />;
    }
    if (errorMessage) {
      return <ErrorState message={errorMessage} onRetry={onRetry} />;
    }
    return <EmptyState title="Email Details" message="No email loaded yet." />;
  }

  const summarize = onSummarize ? () => onSummarize(email.id) : undefined;
  const summarizeLabel = analysis ? 'Analyze Again' : 'Summarize with AI';

  return (
    <View style={contentStyles.stack}>
      <EmailHeader email={email} />
      {loading ? <LoadingState message="Updating email..." /> : null}
      {!loading && errorMessage ? (
        <ErrorState message={errorMessage} onRetry={onRetry} />
      ) : null}
      <View style={styles.actions}>
        <AppButton
          label={email.isRead ? 'Mark Unread' : 'Mark Read'}
          onPress={
            onMarkRead ? () => onMarkRead(email.id, !email.isRead) : undefined
          }
          loading={markingRead}
          disabled={loading}
          variant="compact"
        />
        <AppButton
          label={summarizeLabel}
          onPress={summarize}
          loading={analyzing}
          disabled={loading || analyzing}
          variant="compact"
        />
      </View>
      <SectionCard title="Email Content">
        <Text selectable style={contentStyles.body}>
          {email.contentText}
        </Text>
      </SectionCard>
      <SectionCard title="Attachments">
        {email.attachments.length === 0 ? (
          <EmptyState title="No attachments" />
        ) : (
          email.attachments.map(attachment => (
            <AttachmentItem
              key={attachment.id}
              attachment={attachment}
              onOpen={onOpenAttachment}
            />
          ))
        )}
      </SectionCard>
      <AIAnalysisView
        analysis={analysis}
        analysisComplete={analysisComplete}
        loading={analyzing}
        errorMessage={analysisErrorMessage}
        onRetry={summarize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
