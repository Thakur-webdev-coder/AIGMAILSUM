# Email Details and AI Analysis presentation

EmailDetailsScreen only supplies the responsive ScreenContainer and an empty
EmailDetailsView. The existing EmailDetails route still requires emailId; a future
controller can use it to supply data. No loading, authentication or network work
starts when the screen mounts. No example emails or analyses are included.

## Email details

EmailDetailsView accepts a complete EmailDetails display model: id, sender,
recipients, subject, dateTimeLabel, contentText, isRead and attachments. Content is
selectable plain text without line limits; the caller must supply the entire body,
not a Gmail snippet, base64 payload or raw HTML. Decoding/HTML conversion and date
formatting belong to a future adapter. No WebView or remote image loading is used.

Optional callbacks are onMarkRead(emailId, isRead), onSummarize(emailId),
onOpenAttachment(attachmentId), and onRetry(). Loading, markingRead, analyzing,
errorMessage and analysisErrorMessage are controlled by the caller. Actions do not
change email state internally. Buttons without handlers are disabled. Attachment
opening is shown only when its callback exists.

AttachmentItem displays the supplied filename, MIME type and optional formatted
size. EmailHeader displays sender, recipients, subject, time and read status.

## Analysis

AIAnalysisView consumes the existing EmailAnalysis type. That domain now includes
keyPoints; ImportantInformation also includes deadlines, requirements and links.
Existing dates, amounts, people, organizations and actionItems are preserved.
Action Items are rendered from importantInformation.actionItems, with no second
source of truth. Supply empty arrays when a field has no extracted values.

AnalysisList and ImportantInformationSection render supplied information only.
Links are selectable text; they are not opened or fetched. Category and priority
use the existing strict unions and shared Badge. The caller must supply an analysis
for the currently displayed email. No AI responses are generated or validated here.

## Layout and validation

All content shares one screen scroll container, safe areas, responsive gutters and
the existing tablet width cap. Text wraps and respects native font scaling; email
bodies, recipients, attachment names, analysis text and links are not truncated.
Buttons retain minimum 48-point touch targets. Sections use shared styles and cards.

Run npm run typecheck, npm run lint, and npm test -- --runInBand. Native visual,
large-text and accessibility verification remains for a later device testing step;
no emulator or device is started for this UI step.
