# Login and Inbox UI

LoginScreen and InboxScreen only compose UI. No authentication, API integration,
email fixtures or email filtering business logic is implemented.

- LoginView accepts onGoogleSignIn, loading and errorMessage. With no handler,
  Google Sign In is disabled. Loading and retry errors use the shared states.
- InboxView accepts immutable emails, searchQuery, selectedFilter, search/filter
  change callbacks, onOpenEmail(id), onMarkRead(id, isRead), onRefresh, onLoadMore,
  onRetry, loading, refreshing, loadingMore, hasMore and errorMessage.
- The future caller supplies filtered data and controls loading states. Set
  loadingMore while a pagination request is active and deduplicate requests in
  that future data layer. Pagination is gated while loading, refreshing, errored,
  without existing rows, or when hasMore is false.
- InboxEmail is a display model with sender, subject, preview, dateTimeLabel and
  isRead. Date formatting belongs to the future adapter; the row displays the
  provided date/time label. No Gmail response assumptions are built into the UI.
- EmailListItem has separate open and mark-read controls, with no nested buttons.
  Read state is indicated by text and weight, not color alone. Sender/subject and
  preview have bounded line counts; accessibility exposes their full text.
- InboxToolbar keeps search and the five wrapping filter chips in the list header.
  Header, rows and empty states share one vertical FlatList, avoiding nested lists
  and allowing controls to scroll away on short screens or with large text.
- Both screens reuse safe areas, responsive gutters, font scaling, shared colors
  and the tablet content width cap. Controls have at least 48-point touch targets.

Authenticated tabs remain gated by the existing authentication state. No bypass
was added to preview Inbox. Render InboxView in an authorized preview/test context
or connect it when real authentication is implemented.

Reference: https://reactnative.dev/docs/flatlist
