import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { fetchInboxPage } from '../../src/services/gmail/inbox';
import { useInbox } from '../../src/features/inbox/useInbox';
import type { InboxEmail } from '../../src/features/inbox/types';
import type { InboxPage } from '../../src/services/gmail/inbox';

jest.mock('../../src/services/gmail/inbox', () => ({
  fetchInboxPage: jest.fn(),
  modifyInboxEmailReadState: jest.fn(),
}));

function email(id: string, overrides: Partial<InboxEmail> = {}): InboxEmail {
  return {
    id,
    sender: `${id}@example.test`,
    subject: id,
    preview: id,
    dateTimeLabel: 'Today',
    isRead: true,
    ...overrides,
  };
}

function page(id: string, nextPageToken?: string): InboxPage {
  return { emails: [email(id)], nextPageToken };
}

function pageWith(emails: InboxEmail[], nextPageToken?: string): InboxPage {
  return { emails, nextPageToken };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

let latest: ReturnType<typeof useInbox>;

function Harness() {
  latest = useInbox();
  return null;
}

async function mountInbox() {
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<Harness />);
  });
  return renderer!;
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

async function unmount(renderer: TestRenderer.ReactTestRenderer) {
  await act(async () => {
    renderer.unmount();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  (fetchInboxPage as jest.Mock).mockResolvedValue(page('normal'));
});

afterEach(() => {
  jest.useRealTimers();
});

test('automatically searches after debounce when at least three characters are typed', async () => {
  const renderer = await mountInbox();
  await advance(0);

  act(() => {
    latest.onSearchChange('rav');
  });
  await advance(499);
  expect(fetchInboxPage).toHaveBeenCalledTimes(1);

  await advance(1);
  expect(fetchInboxPage).toHaveBeenCalledTimes(2);
  expect(fetchInboxPage).toHaveBeenLastCalledWith(
    expect.objectContaining({ searchQuery: 'rav', filter: 'All' }),
    expect.any(AbortSignal),
  );

  await unmount(renderer);
});

test('keyboard search submits immediately without waiting for debounce', async () => {
  const renderer = await mountInbox();
  await advance(0);
  jest.clearAllMocks();

  act(() => {
    latest.onSearchChange('rav');
    latest.onSearchSubmit();
  });
  await advance(0);

  expect(fetchInboxPage).toHaveBeenCalledTimes(1);
  expect(fetchInboxPage).toHaveBeenLastCalledWith(
    expect.objectContaining({ searchQuery: 'rav', filter: 'All' }),
    expect.any(AbortSignal),
  );

  await advance(500);
  expect(fetchInboxPage).toHaveBeenCalledTimes(1);
  await unmount(renderer);
});

test('does not request search before three characters', async () => {
  const renderer = await mountInbox();
  await advance(0);
  jest.clearAllMocks();

  act(() => {
    latest.onSearchChange('ra');
  });
  await advance(500);

  expect(fetchInboxPage).not.toHaveBeenCalled();
  await unmount(renderer);
});

test('latest query wins over stale in-flight search results', async () => {
  const rav = deferred<InboxPage>();
  const ravi = deferred<InboxPage>();
  (fetchInboxPage as jest.Mock).mockImplementation(({ searchQuery }) => {
    if (searchQuery === 'rav') {
      return rav.promise;
    }
    if (searchQuery === 'ravi') {
      return ravi.promise;
    }
    return Promise.resolve(page('normal'));
  });
  const renderer = await mountInbox();
  await advance(0);

  act(() => {
    latest.onSearchChange('rav');
  });
  await advance(500);
  expect(fetchInboxPage).toHaveBeenLastCalledWith(
    expect.objectContaining({ searchQuery: 'rav' }),
    expect.any(AbortSignal),
  );

  act(() => {
    latest.onSearchChange('ravi');
  });
  await act(async () => {
    rav.resolve(page('stale'));
    await Promise.resolve();
  });
  expect(latest.emails.map(item => item.id)).not.toEqual(['stale']);

  await advance(500);
  await act(async () => {
    ravi.resolve(page('fresh'));
    await Promise.resolve();
  });
  expect(latest.emails.map(item => item.id)).toEqual(['fresh']);

  await unmount(renderer);
});

test('locally prefix matches currently loaded sender, subject, and preview', async () => {
  (fetchInboxPage as jest.Mock).mockResolvedValue(
    pageWith([
      email('ravina', {
        sender: 'Ravina <ravina@example.test>',
        subject: 'Weekly notes',
        preview: 'Project update',
      }),
      email('other', {
        sender: 'Sam <sam@example.test>',
        subject: 'Invoice',
        preview: 'Receipt attached',
      }),
    ]),
  );
  const renderer = await mountInbox();
  await advance(0);

  act(() => {
    latest.onSearchChange('rav');
  });

  expect(latest.emails.map(item => item.id)).toEqual(['ravina']);
  await unmount(renderer);
});

test('keeps local prefix match visible when server search is empty', async () => {
  (fetchInboxPage as jest.Mock)
    .mockResolvedValueOnce(
      pageWith([
        email('ravina', {
          sender: 'Ravina <ravina@example.test>',
          subject: 'Weekly notes',
          preview: 'Project update',
        }),
        email('other', {
          sender: 'Sam <sam@example.test>',
          subject: 'Invoice',
          preview: 'Receipt attached',
        }),
      ]),
    )
    .mockResolvedValueOnce(pageWith([]));
  const renderer = await mountInbox();
  await advance(0);

  act(() => {
    latest.onSearchChange('rav');
  });
  expect(latest.emails.map(item => item.id)).toEqual(['ravina']);

  await advance(500);
  expect(latest.emails.map(item => item.id)).toEqual(['ravina']);
  await unmount(renderer);
});

test('merges local and server search results', async () => {
  (fetchInboxPage as jest.Mock)
    .mockResolvedValueOnce(
      pageWith([
        email('ravina', {
          sender: 'Ravina <ravina@example.test>',
          subject: 'Weekly notes',
          preview: 'Project update',
        }),
        email('other', {
          sender: 'Sam <sam@example.test>',
          subject: 'Invoice',
          preview: 'Receipt attached',
        }),
      ]),
    )
    .mockResolvedValueOnce(pageWith([email('remote')]));
  const renderer = await mountInbox();
  await advance(0);

  act(() => {
    latest.onSearchChange('rav');
  });
  await advance(500);

  expect(latest.emails.map(item => item.id)).toEqual(['ravina', 'remote']);
  await unmount(renderer);
});

test('deduplicates matching local and server Gmail message ids', async () => {
  (fetchInboxPage as jest.Mock)
    .mockResolvedValueOnce(
      pageWith([
        email('ravina', {
          sender: 'Ravina <ravina@example.test>',
          subject: 'Weekly notes',
          preview: 'Project update',
        }),
      ]),
    )
    .mockResolvedValueOnce(
      pageWith([
        email('ravina', {
          sender: 'Ravina <ravina@example.test>',
          subject: 'Server subject',
          preview: 'Server preview',
        }),
      ]),
    );
  const renderer = await mountInbox();
  await advance(0);

  act(() => {
    latest.onSearchChange('rav');
  });
  await advance(500);

  expect(latest.emails.map(item => item.id)).toEqual(['ravina']);
  expect(latest.emails[0]).toEqual(
    expect.objectContaining({ subject: 'Server subject' }),
  );
  await unmount(renderer);
});

test('clearing search immediately restores current-filter inbox', async () => {
  (fetchInboxPage as jest.Mock).mockResolvedValue(
    pageWith([
      email('ravina', {
        sender: 'Ravina <ravina@example.test>',
        subject: 'Weekly notes',
        preview: 'Project update',
      }),
      email('other', {
        sender: 'Sam <sam@example.test>',
        subject: 'Invoice',
        preview: 'Receipt attached',
      }),
    ]),
  );
  const renderer = await mountInbox();
  await advance(0);

  act(() => {
    latest.onSearchChange('rav');
  });
  expect(latest.emails.map(item => item.id)).toEqual(['ravina']);

  act(() => {
    latest.onSearchChange('');
  });
  expect(latest.emails.map(item => item.id)).toEqual(['ravina', 'other']);

  await advance(0);
  expect(fetchInboxPage).toHaveBeenLastCalledWith(
    expect.objectContaining({
      filter: 'All',
      pageToken: undefined,
      searchQuery: '',
    }),
    expect.any(AbortSignal),
  );

  await unmount(renderer);
});

test('clearing search restores the current selected filter inbox', async () => {
  const renderer = await mountInbox();
  await advance(0);

  act(() => {
    latest.onFilterChange('Unread');
  });
  await advance(0);
  act(() => {
    latest.onSearchChange('rav');
  });
  await advance(500);
  act(() => {
    latest.onSearchChange('');
  });
  await advance(0);

  expect(fetchInboxPage).toHaveBeenLastCalledWith(
    expect.objectContaining({
      filter: 'Unread',
      pageToken: undefined,
      searchQuery: '',
    }),
    expect.any(AbortSignal),
  );

  await unmount(renderer);
});
