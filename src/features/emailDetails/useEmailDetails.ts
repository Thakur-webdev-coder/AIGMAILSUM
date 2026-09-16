import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchEmailDetails } from '../../services/gmail/details';
import { modifyInboxEmailReadState } from '../../services/gmail/inbox';
import {
  analyzeEmailWithEdgeFunction,
  loadSavedEmailAnalysis,
} from '../../services/supabase/emailAnalysis';
import { AppError } from '../../types/appError';
import type { EmailAnalysis } from '../../types/email';
import type { EmailDetails } from './types';

interface EmailDetailsState {
  email?: EmailDetails;
  analysis?: EmailAnalysis;
  analysisComplete: boolean;
  loading: boolean;
  analyzing: boolean;
  markingRead: boolean;
  error: AppError | null;
  analysisError: AppError | null;
}

interface UseEmailDetailsOptions {
  onAnalysisComplete?: () => void;
}

function toAppError(error: unknown, message: string): AppError {
  return error instanceof AppError
    ? error
    : new AppError('GMAIL_API_ERROR', message, { cause: error });
}

export function useEmailDetails(
  emailId: string,
  options: UseEmailDetailsOptions = {},
) {
  const [state, setState] = useState<EmailDetailsState>({
    analysisComplete: false,
    loading: true,
    analyzing: false,
    markingRead: false,
    error: null,
    analysisError: null,
  });
  const current = useRef(state);
  const active = useRef<AbortController | null>(null);
  const update = useCallback((next: EmailDetailsState) => {
    current.current = next;
    setState(next);
  }, []);

  const load = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    update({
      ...current.current,
      loading: true,
      analyzing: false,
      analysisComplete: false,
      error: null,
      analysisError: null,
    });
    try {
      const email = await fetchEmailDetails(emailId, controller.signal);
      if (!controller.signal.aborted) {
        update({
          email,
          loading: false,
          analyzing: true,
          analysisComplete: false,
          markingRead: false,
          error: null,
          analysisError: null,
        });
      }
      try {
        const analysis = await loadSavedEmailAnalysis(emailId);
        if (!controller.signal.aborted) {
          update({
            ...current.current,
            analysis,
            analyzing: false,
            analysisComplete: false,
            analysisError: null,
          });
        }
      } catch (analysisError) {
        if (!controller.signal.aborted) {
          update({
            ...current.current,
            analyzing: false,
            analysisComplete: false,
            analysisError: toAppError(
              analysisError,
              'Unable to load saved AI analysis. Please retry.',
            ),
          });
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        update({
          ...current.current,
          loading: false,
          analyzing: false,
          error: toAppError(error, 'Unable to load this email. Please retry.'),
        });
      }
    } finally {
      if (active.current === controller) {
        active.current = null;
      }
    }
  }, [emailId, update]);

  useEffect(() => {
    load();
    return () => {
      active.current?.abort();
      active.current = null;
    };
  }, [load]);

  const onMarkRead = useCallback(
    async (messageId: string, isRead: boolean) => {
      const before = current.current;
      if (!before.email || before.markingRead) {
        return;
      }
      update({
        ...before,
        email: { ...before.email, isRead },
        markingRead: true,
        error: null,
      });
      try {
        await modifyInboxEmailReadState(messageId, isRead);
        update({ ...current.current, markingRead: false, error: null });
      } catch (error) {
        update({
          ...current.current,
          email: before.email,
          markingRead: false,
          error: toAppError(
            error,
            'Unable to update this email. Please retry.',
          ),
        });
      }
    },
    [update],
  );

  const onSummarize = useCallback(async () => {
    const email = current.current.email;
    if (!email || current.current.analyzing) {
      return;
    }
    update({ ...current.current, analyzing: true, analysisError: null });
    try {
      const analysis = await analyzeEmailWithEdgeFunction(email);
      update({
        ...current.current,
        analysis,
        analyzing: false,
        analysisComplete: true,
        analysisError: null,
      });
      options.onAnalysisComplete?.();
    } catch (error) {
      update({
        ...current.current,
        analyzing: false,
        analysisComplete: false,
        analysisError: toAppError(error, 'Unable to analyze this email.'),
      });
    }
  }, [options, update]);

  return {
    email: state.email,
    analysis: state.analysis,
    analysisComplete: state.analysisComplete,
    loading: state.loading,
    analyzing: state.analyzing,
    markingRead: state.markingRead,
    errorMessage: state.error?.message,
    analysisErrorMessage: state.analysisError?.message,
    onRetry: load,
    onMarkRead,
    onSummarize,
  };
}
