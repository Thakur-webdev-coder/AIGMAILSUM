export type AppErrorCode =
  | 'NETWORK_ERROR'
  | 'GOOGLE_AUTH_ERROR'
  | 'PERMISSION_DENIED'
  | 'GMAIL_API_ERROR'
  | 'AI_API_ERROR'
  | 'INVALID_AI_RESPONSE'
  | 'SUPABASE_ERROR'
  | 'SESSION_EXPIRED'
  | 'UNKNOWN_ERROR';

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AppError';
  }
}
