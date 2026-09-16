import React from 'react';
import { Alert } from 'react-native';
import { AppButton } from '../../../components/common/AppButton';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { logout } from '../authSlice';

export function LogoutButton() {
  const dispatch = useAppDispatch();
  const busy = useAppSelector(state => state.auth.busy);
  return (
    <AppButton
      label="Log out"
      loading={busy}
      variant="compact"
      onPress={() => {
        dispatch(logout()).then(result => {
          if (logout.rejected.match(result)) {
            Alert.alert(
              'Logout failed',
              result.payload?.message ?? 'Please try again.',
            );
          }
        });
      }}
    />
  );
}
