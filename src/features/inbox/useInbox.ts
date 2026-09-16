import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchInboxPage,
  modifyInboxEmailReadState,
} from '../../services/gmail/inbox';
import { AppError } from '../../types/appError';
import type { InboxEmail, InboxFilter } from './types';

type RequestKind = 'initial' | 'refresh' | 'more';
interface InboxState {
  emails: InboxEmail[];
  nextPageToken?: string;
  pending: RequestKind | null;
  failed: RequestKind | null;
  error: AppError | null;
}
interface InboxCriteria {
  searchQuery: string;
  selectedFilter: InboxFilter;
}
const initialState: InboxState = {
  emails: [],
  pending: 'initial',
  failed: null,
  error: null,
};
const initialCriteria: InboxCriteria = {
  searchQuery: '',
  selectedFilter: 'All',
};
const SEARCH_DEBOUNCE_MS = 500;
const MIN_SEARCH_LENGTH = 3;

interface LoadedInboxPage {
  emails: InboxEmail[];
  nextPageToken?: string;
}

function effectiveCriteria(criteria: InboxCriteria): InboxCriteria {
  const trimmed = criteria.searchQuery.trim();
  return {
    ...criteria,
    searchQuery:
      trimmed.length >= MIN_SEARCH_LENGTH ? criteria.searchQuery : '',
  };
}

function criteriaKey(criteria: InboxCriteria): string {
  return `${criteria.selectedFilter}\n${criteria.searchQuery.trim()}`;
}

function canSearch(criteria: InboxCriteria): boolean {
  return criteria.searchQuery.trim().length >= MIN_SEARCH_LENGTH;
}

function matchesLocalSearch(email: InboxEmail, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return [email.sender, email.subject, email.preview].some(value =>
    value.toLocaleLowerCase().includes(normalizedQuery),
  );
}

export function useInbox() {
  const [state, setState] = useState(initialState);
  const [criteria, setCriteria] = useState(initialCriteria);
  const current = useRef(state);
  const currentCriteria = useRef(criteria);
  const currentEffectiveCriteria = useRef(effectiveCriteria(criteria));
  const active = useRef<AbortController | null>(null);
  const latestRequest = useRef(0);
  const latestLoadedCriteriaKey = useRef<string | null>(null);
  const normalPages = useRef(new Map<InboxFilter, LoadedInboxPage>());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedCriteriaKey = useRef<string | null>(null);
  const update = useCallback((next: InboxState) => {
    current.current = next;
    setState(next);
  }, []);
  const updateCriteria = useCallback((next: InboxCriteria) => {
    currentCriteria.current = next;
    submittedCriteriaKey.current = null;
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    latestRequest.current += 1;
    active.current?.abort();
    active.current = null;
    setCriteria(next);
  }, []);
  const load = useCallback(
    async (
      kind: RequestKind,
      nextCriteria = currentCriteria.current,
      preserveInitialEmails = false,
    ) => {
      if (active.current) {
        if (kind === 'more') {
          return;
        }
        active.current.abort();
        active.current = null;
      }
      const before = current.current;
      if (kind === 'more' && !before.nextPageToken) {
        return;
      }
      const requestId = latestRequest.current + 1;
      latestRequest.current = requestId;
      const controller = new AbortController();
      active.current = controller;
      update({
        ...before,
        emails:
          kind === 'initial' && !preserveInitialEmails
            ? []
            : before.emails,
        nextPageToken: kind === 'initial' ? undefined : before.nextPageToken,
        pending: kind,
        failed: null,
        error: null,
      });
      try {
        const page = await fetchInboxPage(
          {
            pageToken: kind === 'more' ? before.nextPageToken : undefined,
            searchQuery: nextCriteria.searchQuery,
            filter: nextCriteria.selectedFilter,
          },
          controller.signal,
        );
        if (
          controller.signal.aborted ||
          latestRequest.current !== requestId
        ) {
          return;
        }
        const cachedNormalPage = normalPages.current.get(
          nextCriteria.selectedFilter,
        );
        const localSearchMatches =
          nextCriteria.searchQuery && cachedNormalPage
            ? cachedNormalPage.emails.filter(email =>
                matchesLocalSearch(email, nextCriteria.searchQuery),
              )
            : [];
        const baseEmails =
          nextCriteria.searchQuery && kind !== 'more'
            ? localSearchMatches
            : kind === 'more'
              ? before.emails
              : [];
        const merged = new Map(
          baseEmails.map(email => [email.id, email]),
        );
        page.emails.forEach(email => merged.set(email.id, email));
        if (kind === 'initial' || kind === 'refresh') {
          latestLoadedCriteriaKey.current = criteriaKey(nextCriteria);
        }
        if (!nextCriteria.searchQuery) {
          normalPages.current.set(nextCriteria.selectedFilter, {
            emails: [...merged.values()],
            nextPageToken: page.nextPageToken,
          });
        }
        update({
          emails: [...merged.values()],
          nextPageToken: page.nextPageToken,
          pending: null,
          failed: null,
          error: null,
        });
      } catch (error) {
        if (
          controller.signal.aborted ||
          latestRequest.current !== requestId
        ) {
          return;
        }
        update({
          ...before,
          pending: null,
          failed: kind,
          error:
            error instanceof AppError
              ? error
              : new AppError(
                  'GMAIL_API_ERROR',
                  'Unable to load your inbox. Please retry.',
                  { cause: error },
                ),
        });
      } finally {
        if (active.current === controller) {
          active.current = null;
        }
      }
    },
    [update],
  );
  useEffect(() => {
    currentCriteria.current = criteria;
    const nextEffectiveCriteria = effectiveCriteria(criteria);
    currentEffectiveCriteria.current = nextEffectiveCriteria;
    if (
      latestLoadedCriteriaKey.current === criteriaKey(nextEffectiveCriteria) ||
      submittedCriteriaKey.current === criteriaKey(nextEffectiveCriteria)
    ) {
      return undefined;
    }
    const delay =
      canSearch(criteria) ? SEARCH_DEBOUNCE_MS : 0;
    const timer = setTimeout(() => {
      debounceTimer.current = null;
      load(
        'initial',
        nextEffectiveCriteria,
        canSearch(criteria) ||
          normalPages.current.has(nextEffectiveCriteria.selectedFilter),
      );
    }, delay);
    debounceTimer.current = timer;
    return () => {
      clearTimeout(timer);
      if (debounceTimer.current === timer) {
        debounceTimer.current = null;
      }
    };
  }, [criteria, load]);
  useEffect(
    () => () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      active.current?.abort();
      active.current = null;
    },
    [],
  );
  const onMarkRead = useCallback(
    async (emailId: string, isRead: boolean) => {
      const before = current.current;
      const optimisticEmails =
        currentCriteria.current.selectedFilter === 'Unread' && isRead
          ? before.emails.filter(email => email.id !== emailId)
          : before.emails.map(email =>
              email.id === emailId ? { ...email, isRead } : email,
            );
      update({ ...before, emails: optimisticEmails, error: null });
      try {
        await modifyInboxEmailReadState(emailId, isRead);
      } catch (error) {
        update({
          ...current.current,
          emails: before.emails,
          error:
            error instanceof AppError
              ? error
              : new AppError(
                  'GMAIL_API_ERROR',
                  'Unable to update this email. Please retry.',
                  { cause: error },
                ),
        });
      }
    },
    [update],
  );
  const onSearchChange = useCallback(
    (searchQuery: string) => {
      const nextCriteria = { ...currentCriteria.current, searchQuery };
      updateCriteria(nextCriteria);
      const cache = normalPages.current.get(nextCriteria.selectedFilter);
      if (!cache) {
        return;
      }
      const nextEffectiveCriteria = effectiveCriteria(nextCriteria);
      currentEffectiveCriteria.current = nextEffectiveCriteria;
      if (canSearch(nextCriteria)) {
        update({
          ...current.current,
          emails: cache.emails.filter(email =>
            matchesLocalSearch(email, searchQuery),
          ),
          nextPageToken: undefined,
          pending: null,
          failed: null,
          error: null,
        });
        return;
      }
      update({
        ...current.current,
        emails: cache.emails,
        nextPageToken: cache.nextPageToken,
        pending: null,
        failed: null,
        error: null,
      });
    },
    [update, updateCriteria],
  );
  const onSearchSubmit = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    const nextCriteria = effectiveCriteria(currentCriteria.current);
    currentEffectiveCriteria.current = nextCriteria;
    if (latestLoadedCriteriaKey.current === criteriaKey(nextCriteria)) {
      return;
    }
    submittedCriteriaKey.current = criteriaKey(nextCriteria);
    load(
      'initial',
      nextCriteria,
      canSearch(currentCriteria.current) ||
        normalPages.current.has(nextCriteria.selectedFilter),
    );
  }, [load]);
  return {
    emails: state.emails,
    searchQuery: criteria.searchQuery,
    selectedFilter: criteria.selectedFilter,
    loading: state.pending === 'initial',
    refreshing: state.pending === 'refresh',
    loadingMore: state.pending === 'more',
    hasMore: Boolean(state.nextPageToken),
    errorMessage: state.error?.message,
    onSearchChange,
    onSearchSubmit,
    onFilterChange: (selectedFilter: InboxFilter) => {
      updateCriteria({ ...currentCriteria.current, selectedFilter });
    },
    onRefresh: () => {
      load('refresh', currentEffectiveCriteria.current);
    },
    onLoadMore: () => {
      if (!current.current.error) {
        load('more', currentEffectiveCriteria.current);
      }
    },
    onRetry: () => {
      load(current.current.failed ?? 'initial', currentEffectiveCriteria.current);
    },
    onMarkRead,
  };
}
