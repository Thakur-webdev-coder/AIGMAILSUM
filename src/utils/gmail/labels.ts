function hasLabel(labelIds: unknown, label: string): boolean {
  return (
    Array.isArray(labelIds) &&
    labelIds.some((value: unknown) => value === label)
  );
}

export function isGmailUnread(labelIds: unknown): boolean {
  return hasLabel(labelIds, 'UNREAD');
}

export function isGmailRead(labelIds: unknown): boolean {
  return !isGmailUnread(labelIds);
}

export function isGmailImportant(labelIds: unknown): boolean {
  return hasLabel(labelIds, 'IMPORTANT');
}
