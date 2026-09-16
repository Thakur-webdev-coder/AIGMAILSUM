import React, { useCallback, useRef } from 'react';
import type { ComponentRef } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView } from 'react-native';
import type { RootStackParamList } from '../../../app/navigation/types';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { EmailDetailsView } from '../components/EmailDetailsView';
import { useEmailDetails } from '../useEmailDetails';

type EmailDetailsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'EmailDetails'
>;

export function EmailDetailsScreen({ route }: EmailDetailsScreenProps) {
  const scrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollToAnalysis = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, []);
  const details = useEmailDetails(route.params.emailId, {
    onAnalysisComplete: scrollToAnalysis,
  });
  return (
    <ScreenContainer
      safeAreaEdges={['left', 'right', 'bottom']}
      scrollViewRef={scrollViewRef}
    >
      <EmailDetailsView {...details} />
    </ScreenContainer>
  );
}
