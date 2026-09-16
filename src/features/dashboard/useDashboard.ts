import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { fetchDashboardData } from '../../services/supabase/dashboard';
import { AppError } from '../../types/appError';
import type { DashboardMetrics, PendingAction } from './types';

interface DashboardState {
  metrics?: DashboardMetrics;
  pendingActions?: PendingAction[];
  loading: boolean;
  refreshing: boolean;
  error: AppError | null;
}

function toAppError(error: unknown): AppError {
  return error instanceof AppError
    ? error
    : new AppError('UNKNOWN_ERROR', 'Unable to load dashboard. Please retry.', {
        cause: error,
      });
}

export function useDashboard() {
  const [state, setState] = useState<DashboardState>({
    loading: true,
    refreshing: false,
    error: null,
  });
  const current = useRef(state);
  const active = useRef<AbortController | null>(null);
  const update = useCallback((next: DashboardState) => {
    current.current = next;
    setState(next);
  }, []);

  const load = useCallback(
    async (refreshing = false) => {
      active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      update({
        ...current.current,
        loading: !refreshing && !current.current.metrics,
        refreshing,
        error: null,
      });
      try {
        const data = await fetchDashboardData(controller.signal);
        if (!controller.signal.aborted) {
          update({
            metrics: data.metrics,
            pendingActions: data.pendingActions,
            loading: false,
            refreshing: false,
            error: null,
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          update({
            ...current.current,
            loading: false,
            refreshing: false,
            error: toAppError(error),
          });
        }
      } finally {
        if (active.current === controller) {
          active.current = null;
        }
      }
    },
    [update],
  );

  useFocusEffect(
    useCallback(() => {
      load(Boolean(current.current.metrics));
      return () => {
        active.current?.abort();
        active.current = null;
      };
    }, [load]),
  );

  return {
    metrics: state.metrics,
    pendingActions: state.pendingActions,
    loading: state.loading,
    refreshing: state.refreshing,
    errorMessage: state.error?.message,
    onRefresh: () => load(true),
    onRetry: () => load(Boolean(current.current.metrics)),
  };
}
