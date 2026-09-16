# Project foundation

React Native 0.87.1, React 19.2.3, TypeScript 6.0.3. The application name remains
AIGmailSummarizer and the Android application ID remains com.aigmailsummarizer.

## Boundaries

- app/navigation owns the typed root stack and Dashboard/Inbox tabs.
- app/store composes feature reducers and exports RootState and AppDispatch.
- features owns screens and future feature state. Authentication starts signed out;
  there is no development login bypass or fabricated session.
- components/common provides LoadingState, ErrorState and EmptyState.
- services/google, services/gmail and services/supabase own future SDK/API access.
- hooks provides typed Redux hooks; types holds email, Gmail and error contracts.
- config owns environment configuration; constants and utils are reserved folders.
- Empty folders are tracked with .gitkeep until implementation is authorized.

No login, Gmail request, AI analysis, dashboard business logic or database operation
is implemented. All four screens are placeholders. Authenticated routes become
available only when real authentication is implemented in the next step.

## Environment

Copy .env.example to .env and fill in:

- SUPABASE_URL: public project URL.
- SUPABASE_PUBLISHABLE_KEY: public publishable key.
- GOOGLE_WEB_CLIENT_ID: OAuth client ID of type Web application.

react-native-dotenv substitutes these values at build time through Babel. Import
configuration through src/config/env.ts. Restart Metro with `npm start -- --reset-cache`
and rebuild after changing values. CI may provide the same environment variables.
The placeholder app runs with an absent or blank .env. getSupabaseClient() validates
required Supabase configuration when first used and reuses one client thereafter.

All bundled configuration is public. Never put private credentials in the app.
The Supabase client uses AsyncStorage, persistent sessions, token auto-refresh,
disabled URL session detection and processLock. It is not initialized by the UI.
When implementing auth, add foreground/background refresh lifecycle management
and session restoration in the application/service layer, with subscription cleanup.
AsyncStorage is not encrypted; do not treat it as a secret vault.

## Dependencies and native setup

Requested runtime dependencies are pinned in package.json/package-lock.json.
AsyncStorage 2.2.0 retains the default storage adapter used by Supabase and declares
support for this React Native version. react-native-dotenv is a development-only
addition for React Native CLI environment loading.

Android includes the screens fragment restoration factory and disables predictive
back as directed by React Navigation. The application ID has not changed.
Rebuild Android after installing native dependencies. On macOS, run `bundle install`
and then `bundle exec pod install` from ios before building iOS.

## Validation commands

- npm run typecheck
- npm run lint
- npm test -- --runInBand

## Prerequisites for the next Google Authentication step

- Configure the Google OAuth consent screen and test users as applicable.
- Provide the Web OAuth client ID in .env.
- Register an Android OAuth client for com.aigmailsummarizer and the SHA-1 of the
  signing certificate used by the development build. Register release signing
  fingerprints when that build is introduced.
- For iOS, obtain an iOS OAuth client matching the existing bundle ID, configure its
  reversed-client-ID URL scheme, install pods and validate on macOS.
- If exchanging Google identity for a Supabase session, configure that provider in
  Supabase and supply the public Supabase environment values. Server-side provider
  credentials belong only in the provider/backend configuration.
- Rebuild and exercise sign-in on a device/emulator after implementing the service.

## References

- [React Navigation setup](https://reactnavigation.org/docs/getting-started/)
- [React Native Screens compatibility](https://github.com/software-mansion/react-native-screens#supported-react-native-version)
- [Supabase React Native client](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [Google OAuth configuration](https://react-native-google-signin.github.io/docs/setting-up/get-config-file)
- [Gmail message models](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages)
