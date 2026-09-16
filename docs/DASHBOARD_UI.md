# Dashboard and Pending Actions UI

DashboardScreen wraps DashboardView in the existing scrolling ScreenContainer.
It supplies no counts or pending actions. No API, authentication, aggregation,
AI analysis, or example data is implemented.

DashboardView accepts metrics, pendingActions, and onOpenEmail(messageId).
DashboardMetrics contains exactly totalEmails, unreadEmails, importantEmails,
highPriorityEmails, aiAnalyzedEmails and emailsRequiringAction. Each value is a
number or null. Omitted metrics/null values show Not available; a supplied zero
is displayed as zero. All six labels are always visible.

StatCard is a reusable common component accepting label and value. DashboardStats
arranges it with wrapping Flexbox cells. A preferred basis of 240 points grows
with font scale; cells can shrink below that width. Cards have no fixed height,
text has no line limit, and the shared ScreenContainer caps tablet content width.
Labels and values wrap and native text scaling is preserved. The layout adapts
to parent width without phone-model or platform-specific dimensions.

PendingAction contains id, text and relatedMessageId. The shared GmailMessageId
alias is derived from GmailMessageReference.id, maintaining the existing string
ID model. PendingActionItem accepts text, relatedMessageId and onPress(messageId).
It never navigates or mutates data itself; without a callback it is disabled.
Its touch area is at least 48 points tall and action text is not truncated.

PendingActionsSection renders supplied items in the screen's single scroll view.
An omitted actions array shows unavailable state; an explicitly empty array shows
No pending actions. No fake actions or default counts are supplied.

Validation: npm run typecheck, npm run lint, npm test -- --runInBand.
No emulator or device is launched. Native layout and screen-reader testing remain
for a later device-testing step.
