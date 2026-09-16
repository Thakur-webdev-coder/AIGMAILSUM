import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { signInWithGoogle, signOut } from '../../services/auth/googleAuth';
import { AppError, type AppErrorCode } from '../../types/appError';

type AuthFailure = { code: AppErrorCode; message: string };
export interface AuthState {
  isAuthenticated: boolean;
  initializing: boolean;
  busy: boolean;
  logoutNeedsRetry: boolean;
  error: AuthFailure | null;
}
const initialState: AuthState = {
  isAuthenticated: false,
  initializing: true,
  busy: false,
  logoutNeedsRetry: false,
  error: null,
};
export function authFailure(error: unknown): AuthFailure {
  const appError =
    error instanceof AppError
      ? error
      : new AppError(
          'UNKNOWN_ERROR',
          'Authentication failed. Please try again.',
          { cause: error },
        );
  return { code: appError.code, message: appError.message };
}
const thunkConfig = {
  condition: (_: void, { getState }: { getState: () => { auth: AuthState } }) =>
    !getState().auth.busy,
};
export const login = createAsyncThunk<
  boolean | null,
  void,
  { state: { auth: AuthState }; rejectValue: AuthFailure }
>(
  'auth/login',
  async (_, { rejectWithValue }) => {
    try {
      return (await signInWithGoogle()) ? true : null;
    } catch (error) {
      return rejectWithValue(authFailure(error));
    }
  },
  thunkConfig,
);
export const logout = createAsyncThunk<
  void,
  void,
  { state: { auth: AuthState }; rejectValue: AuthFailure }
>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await signOut();
    } catch (error) {
      return rejectWithValue(authFailure(error));
    }
  },
  thunkConfig,
);
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionChanged(state, action: PayloadAction<boolean>) {
      state.isAuthenticated = action.payload;
    },
    restorationFinished(state) {
      state.initializing = false;
    },
    authFailed(state, action: PayloadAction<AuthFailure>) {
      state.error = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(login.pending, state => {
        state.busy = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.busy = false;
        if (action.payload) {
          state.isAuthenticated = true;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.busy = false;
        state.error = action.payload ?? authFailure(null);
      })
      .addCase(logout.pending, state => {
        state.busy = true;
        state.error = null;
      })
      .addCase(logout.fulfilled, state => {
        state.busy = false;
        state.isAuthenticated = false;
        state.error = null;
        state.logoutNeedsRetry = false;
      })
      .addCase(logout.rejected, (state, action) => {
        state.busy = false;
        state.logoutNeedsRetry = true;
        state.error = action.payload ?? authFailure(null);
      });
  },
});
export const { sessionChanged, restorationFinished, authFailed } =
  authSlice.actions;
export const authReducer = authSlice.reducer;
