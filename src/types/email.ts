export type EmailCategory =
  | 'Work'
  | 'Personal'
  | 'Finance'
  | 'Marketing'
  | 'Social'
  | 'Other';

export type EmailPriority = 'High' | 'Medium' | 'Low';

// Extracted text only; normalization and runtime AI validation belong to services.
export interface ImportantInformation {
  deadlines: string[];
  requirements: string[];
  links: string[];
  dates: string[];
  amounts: string[];
  people: string[];
  organizations: string[];
  actionItems: string[];
}

export interface EmailAnalysis {
  emailId: string;
  summary: string;
  keyPoints: string[];
  category: EmailCategory;
  priority: EmailPriority;
  importantInformation: ImportantInformation;
}
