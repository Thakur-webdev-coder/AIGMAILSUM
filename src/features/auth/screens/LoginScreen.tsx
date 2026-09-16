import React from 'react';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { LoginView } from '../components/LoginView';

export function LoginScreen() {
  return (
    <ScreenContainer safeAreaEdges={['left', 'right', 'bottom']}>
      <LoginView />
    </ScreenContainer>
  );
}
