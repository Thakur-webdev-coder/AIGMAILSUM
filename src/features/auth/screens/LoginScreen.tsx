import React from 'react';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { LoginView } from '../components/LoginView';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { login } from '../authSlice';
import { LogoutButton } from '../components/LogoutButton';

export function LoginScreen() {
  const dispatch = useAppDispatch();
  const { busy, error, logoutNeedsRetry } = useAppSelector(state => state.auth);
  return (
    <ScreenContainer safeAreaEdges={['left', 'right', 'bottom']}>
      <LoginView
        loading={busy}
        errorMessage={error?.message}
        onGoogleSignIn={() => {
          dispatch(login());
        }}
      />
      {logoutNeedsRetry ? <LogoutButton /> : null}
    </ScreenContainer>
  );
}
