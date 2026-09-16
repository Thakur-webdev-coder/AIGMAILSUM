import React from 'react';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { DashboardView } from '../components/DashboardView';

export function DashboardScreen() {
  return (
    <ScreenContainer safeAreaEdges={['left', 'right']}>
      <DashboardView />
    </ScreenContainer>
  );
}
