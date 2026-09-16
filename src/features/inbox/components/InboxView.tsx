import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { EmptyState } from '../../../components/common/EmptyState';
import { ErrorState } from '../../../components/common/ErrorState';
import { LoadingState } from '../../../components/common/LoadingState';
import { spacing } from '../../../constants/ui';
import type { EmailActions, InboxEmail, InboxFilter } from '../types';
import { EmailListItem } from './EmailListItem';
import { InboxToolbar } from './InboxToolbar';

export interface InboxViewProps extends EmailActions {
  emails: readonly InboxEmail[];
  searchQuery: string;
  selectedFilter: InboxFilter;
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: InboxFilter) => void;
  loading?: boolean;
  refreshing?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  errorMessage?: string;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onRetry?: () => void;
}

export function InboxView({
  emails,
  searchQuery,
  selectedFilter,
  onSearchChange,
  onFilterChange,
  onOpenEmail,
  onMarkRead,
  loading = false,
  refreshing = false,
  loadingMore = false,
  hasMore = false,
  errorMessage,
  onRefresh,
  onLoadMore,
  onRetry,
}: InboxViewProps) {
  const emptyContent = loading ? (
    <LoadingState message="Loading inbox..." />
  ) : errorMessage ? (
    <ErrorState message={errorMessage} onRetry={onRetry} />
  ) : (
    <EmptyState
      title="No emails to display"
      message={
        searchQuery || selectedFilter !== 'All'
          ? 'Try another search or filter.'
          : 'Your emails will appear here once your inbox is connected.'
      }
    />
  );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={emails}
      keyExtractor={email => email.id}
      renderItem={({ item }) => (
        <EmailListItem
          email={item}
          onOpenEmail={onOpenEmail}
          onMarkRead={onMarkRead}
        />
      )}
      ListHeaderComponent={
        <InboxToolbar
          searchQuery={searchQuery}
          selectedFilter={selectedFilter}
          onSearchChange={onSearchChange}
          onFilterChange={onFilterChange}
        />
      }
      ListEmptyComponent={emptyContent}
      ListFooterComponent={
        emails.length > 0 ? (
          loadingMore ? (
            <LoadingState message="Loading more emails..." />
          ) : errorMessage ? (
            <ErrorState message={errorMessage} onRetry={onRetry} />
          ) : undefined
        ) : undefined
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={() => {
        if (
          emails.length > 0 &&
          hasMore &&
          !loading &&
          !refreshing &&
          !loadingMore &&
          !errorMessage
        ) {
          onLoadMore?.();
        }
      }}
      onEndReachedThreshold={0.3}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { flexGrow: 1, gap: spacing.md },
});
