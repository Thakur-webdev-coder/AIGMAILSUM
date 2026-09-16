export interface DateFormatOptions {
  locale?: string;
  timeZone?: string;
  fallback?: string;
}

/** Numeric values and digit-only strings are epoch milliseconds, including zero. */
export function parseDateMillis(value: unknown): number | null {
  let millis: number;
  if (value instanceof Date) {
    millis = value.getTime();
  } else if (typeof value === 'number') {
    millis = value;
  } else if (typeof value === 'string' && value.trim()) {
    millis = /^-?\d+$/.test(value.trim()) ? Number(value) : Date.parse(value);
  } else {
    return null;
  }
  return Number.isFinite(millis) && !Number.isNaN(new Date(millis).getTime())
    ? millis
    : null;
}

export function formatGmailDate(
  value: unknown,
  options: DateFormatOptions = {},
): string {
  const fallback = options.fallback ?? 'Unknown date';
  const millis = parseDateMillis(value);
  if (millis === null) {
    return fallback;
  }
  try {
    return new Intl.DateTimeFormat(options.locale ?? 'en-US', {
      timeZone: options.timeZone ?? 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(millis);
  } catch {
    return fallback;
  }
}
