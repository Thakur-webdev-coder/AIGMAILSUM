import React from 'react';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { EmailDetailsView } from '../components/EmailDetailsView';

export function EmailDetailsScreen() {
  return (
    <ScreenContainer safeAreaEdges={['left', 'right', 'bottom']}>
      <EmailDetailsView />
    </ScreenContainer>
  );
}
