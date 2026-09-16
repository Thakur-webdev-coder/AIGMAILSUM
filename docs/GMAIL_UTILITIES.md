# Pure Gmail parsing and formatting

Public exports are in src/utils/gmail/index.ts. Utilities contain no React Native,
Node Buffer, SDK, filesystem, network, clock or mutable application-state access.
Test fixtures and test-only Buffer encoding live exclusively in **tests**/gmail.
UI screens and data integrations are unchanged.

## Contracts

- extractGmailHeaders(headers) extracts From, To, Subject and Date case-insensitively.
  It unfolds continuation lines, joins repeated To headers, ignores malformed
  entries and uses empty strings for missing values. getGmailHeader returns the
  first valid value or undefined. Header values are not RFC 2047-decoded.
- splitRecipients preserves quoted display names, angle addresses and comments.
  It is a display helper, not a full RFC mailbox/group-address validator.
- decodeBase64Url accepts padded/unpadded Base64URL and standard Base64 UTF-8 text.
  Empty text is valid. Invalid alphabet, padding, unused bits or UTF-8 returns null.
  It does not depend on Buffer, atob or TextDecoder. Non-UTF-8 charsets require a
  future explicit charset adapter; invalid bytes are never silently reinterpreted.
- parseGmailBody returns plainText, decoded untrusted html, and display text.
  Multipart alternatives prefer plain text and avoid duplicating the HTML version.
  Mixed sections are concatenated in order; related sections use the first body.
  Attachments and their nested messages are excluded from the email body.
  Cycles, depth over 64 and traversal over 10,000 parts are bounded defensively.
- HTML conversion is a best-effort plain-text projection with common/numeric entity
  decoding and block breaks. It is not a full HTML parser or sanitizer. Raw HTML
  must not be rendered in a WebView. No remote resources or links are opened.
- extractGmailAttachments preserves remote attachment IDs and MIME part IDs, type,
  name, size and inline disposition. Local inline parts without IDs use deterministic
  payload paths. Missing names/types have display fallbacks; invalid size is null.
  A text body requiring an external attachment fetch remains unavailable rather
  than being mistaken for an email attachment. No fetch is attempted.
- UNREAD and IMPORTANT checks use exact system labels. Without UNREAD, isGmailRead
  is true; absent labels cannot express unknown read state in the existing UI model.
- Date formatting defaults to en-US/UTC and never reads the current time. Numeric
  inputs are epoch milliseconds. Other strings use Date.parse (ISO/RFC strings with
  explicit timezone are recommended). Invalid input, locale or timezone uses the
  caller fallback or Unknown date. The mapper prefers internalDate, then Date header.
- mapGmailMessageToInbox and mapGmailMessageToDetails accept unknown at the boundary
  and return existing typed display models, or null when the message ID is missing.
  Inbox uses the snippet if present, otherwise a body-derived 200-code-point preview.
  Details uses the complete available decoded body, never a snippet. MIME parts
  with unavailable external data remain empty; callers must obtain a full payload
  before describing that content as complete. Gmail RAW-format parsing is not included.

Tests cover normal Unicode, malformed encodings, missing fields, nested MIME,
attachment exclusion/metadata, cycle/depth safety, labels, date failures, list/detail
mapping, body fallbacks and source-data immutability.
