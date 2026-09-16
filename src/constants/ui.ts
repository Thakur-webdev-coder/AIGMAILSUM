import type { TextStyle } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const layout = {
  contentMaxWidth: 720,
  tabletBreakpoint: 600,
  minTouchTarget: 48,
  cornerRadius: 12,
} as const;

export const colors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  secondaryText: '#475569',
  border: '#CBD5E1',
  primary: '#1D4ED8',
  primaryPressed: '#1E40AF',
  onPrimary: '#FFFFFF',
  muted: '#E2E8F0',
  error: '#B91C1C',
  success: '#15803D',
  successBackground: '#ECFDF5',
  successBorder: '#86EFAC',
} as const;

export const typography = {
  heading: { fontSize: 22, lineHeight: 30, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  label: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
} satisfies Record<string, TextStyle>;
