import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthenticatedTabParamList = {
  Dashboard: undefined;
  Inbox: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  AuthenticatedTabs: NavigatorScreenParams<AuthenticatedTabParamList>;
  EmailDetails: { emailId: string };
};
