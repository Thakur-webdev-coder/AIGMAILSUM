import React from 'react';
import { Text, View } from 'react-native';
import { Badge } from '../../../components/common/Badge';
import { contentStyles } from '../../../components/common/contentStyles';
import { EmptyState } from '../../../components/common/EmptyState';
import { ErrorState } from '../../../components/common/ErrorState';
import { LoadingState } from '../../../components/common/LoadingState';
import { SectionCard } from '../../../components/common/SectionCard';
import type { EmailAnalysis } from '../../../types/email';
import { AnalysisList } from './AnalysisList';
import { ImportantInformationSection } from './ImportantInformationSection';

export interface AIAnalysisViewProps {
  analysis?: EmailAnalysis;
  loading?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

export function AIAnalysisView({
  analysis,
  loading = false,
  errorMessage,
  onRetry,
}: AIAnalysisViewProps) {
  return (
    <View style={contentStyles.stack}>
      <Text accessibilityRole="header" style={contentStyles.heading}>
        AI Analysis
      </Text>
      {loading ? <LoadingState message="Analyzing email..." /> : null}
      {!loading && errorMessage ? (
        <ErrorState message={errorMessage} onRetry={onRetry} />
      ) : null}
      {analysis ? (
        <>
          <View style={contentStyles.badges}>
            <Badge label={`Category: ${analysis.category}`} />
            <Badge label={`Priority: ${analysis.priority}`} />
          </View>
          <SectionCard title="Summary">
            <Text selectable style={contentStyles.body}>
              {analysis.summary}
            </Text>
          </SectionCard>
          <SectionCard>
            <AnalysisList title="Key Points" items={analysis.keyPoints} />
            <AnalysisList
              title="Action Items"
              items={analysis.importantInformation.actionItems}
            />
          </SectionCard>
          <ImportantInformationSection
            information={analysis.importantInformation}
          />
        </>
      ) : !loading && !errorMessage ? (
        <EmptyState
          title="No analysis yet"
          message="Use Summarize with AI to request an analysis."
        />
      ) : null}
    </View>
  );
}
