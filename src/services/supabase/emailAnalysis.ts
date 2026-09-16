import type {
  EmailAnalysis,
  EmailCategory,
  EmailPriority,
  ImportantInformation,
} from '../../types/email';
import type { EmailDetails } from '../../features/emailDetails/types';
import { AppError } from '../../types/appError';
import { asRecord, asString } from '../../utils/gmail/guards';
import { getSupabaseClient } from './client';

const CATEGORIES = new Set<EmailCategory>([
  'Work',
  'Personal',
  'Finance',
  'Marketing',
  'Social',
  'Other',
]);
const PRIORITIES = new Set<EmailPriority>(['High', 'Medium', 'Low']);

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(asString).map(item => item.trim()).filter(Boolean)
    : [];
}

function readImportantInformation(value: unknown): ImportantInformation {
  const record = asRecord(value);
  return {
    deadlines: stringArray(record?.deadlines),
    requirements: stringArray(record?.requirements),
    links: stringArray(record?.links),
    dates: stringArray(record?.dates),
    amounts: stringArray(record?.amounts),
    people: stringArray(record?.people),
    organizations: stringArray(record?.organizations),
    actionItems: stringArray(record?.actionItems ?? record?.action_items),
  };
}

function mapAnalysisRow(value: unknown): EmailAnalysis | undefined {
  const row = asRecord(value);
  if (!row) {
    return undefined;
  }
  const emailId = asString(row.gmail_message_id ?? row.emailId).trim();
  const summary = asString(row.summary).trim();
  const category = asString(row.category).trim();
  const priority = asString(row.priority).trim();
  if (
    !emailId ||
    !summary ||
    !CATEGORIES.has(category as EmailCategory) ||
    !PRIORITIES.has(priority as EmailPriority)
  ) {
    throw new AppError(
      'INVALID_AI_RESPONSE',
      'Saved AI analysis is invalid. Please run analysis again.',
    );
  }
  return {
    emailId,
    summary,
    keyPoints: stringArray(row.keyPoints ?? row.key_points),
    category: category as EmailCategory,
    priority: priority as EmailPriority,
    importantInformation: readImportantInformation(
      row.importantInformation ?? row.important_information,
    ),
  };
}

async function getAuthenticatedSession() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new AppError(
      'SESSION_EXPIRED',
      'Your session expired. Please sign in again.',
      { cause: error },
    );
  }
  return { supabase, session: data.session };
}

export async function loadSavedEmailAnalysis(
  gmailMessageId: string,
): Promise<EmailAnalysis | undefined> {
  try {
    const { supabase, session } = await getAuthenticatedSession();
    const { data, error } = await supabase
      .from('email_analyses')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('gmail_message_id', gmailMessageId)
      .maybeSingle();
    if (error) {
      throw new AppError(
        'SUPABASE_ERROR',
        'Unable to load saved AI analysis. Please retry.',
        { cause: error },
      );
    }
    return mapAnalysisRow(data);
  } catch (error) {
    throw error instanceof AppError
      ? error
      : new AppError(
          'SUPABASE_ERROR',
          'Unable to load saved AI analysis. Please retry.',
          { cause: error },
        );
  }
}

export async function analyzeEmailWithEdgeFunction(
  email: EmailDetails,
): Promise<EmailAnalysis> {
  const existing = await loadSavedEmailAnalysis(email.id);
  if (existing) {
    return existing;
  }
  try {
    const { supabase, session } = await getAuthenticatedSession();
    const { error } = await supabase.functions.invoke('analyze-email', {
      body: {
        gmailMessageId: email.id,
        gmail_message_id: email.id,
        sender: email.sender,
        recipients: email.recipients,
        subject: email.subject,
        content: email.contentText,
        contentText: email.contentText,
        dateTimeLabel: email.dateTimeLabel,
        isRead: email.isRead,
        attachments: email.attachments,
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) {
      throw new AppError(
        'AI_API_ERROR',
        'AI analysis failed. Please retry.',
        { cause: error },
      );
    }
    const saved = await loadSavedEmailAnalysis(email.id);
    if (!saved) {
      throw new AppError(
        'INVALID_AI_RESPONSE',
        'AI analysis did not return a saved result. Please retry.',
      );
    }
    return saved;
  } catch (error) {
    throw error instanceof AppError
      ? error
      : new AppError(
          'NETWORK_ERROR',
          'Unable to reach the AI analysis service. Check your connection and retry.',
          { cause: error },
        );
  }
}
