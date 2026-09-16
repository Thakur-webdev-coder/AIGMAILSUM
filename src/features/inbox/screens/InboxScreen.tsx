import React, { useState } from 'react';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { InboxView } from '../components/InboxView';
import type { InboxEmail, InboxFilter } from '../types';

const emptyEmails: readonly InboxEmail[] = [];

export function InboxScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<InboxFilter>('All');

  return (
    <ScreenContainer scrollable={false} safeAreaEdges={['left', 'right']}>
      <InboxView
        emails={emptyEmails}
        searchQuery={searchQuery}
        selectedFilter={selectedFilter}
        onSearchChange={setSearchQuery}
        onFilterChange={setSelectedFilter}
      />
    </ScreenContainer>
  );
}
