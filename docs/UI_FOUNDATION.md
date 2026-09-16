# Shared UI foundation

All components live in src/components/common. Shared spacing, typography, colors,
content width and touch-target dimensions live in src/constants/ui.ts.

- ScreenContainer supplies safe-area insets, responsive gutters and scrolling.
  By default all edges are protected. With a normal navigation header, omit top;
  with a normal bottom tab bar, also omit bottom. Current placeholders use these
  settings explicitly so navigator insets are not applied twice.
- Content fills phone widths and is centered within a 720-point maximum on tablets.
  Gutters increase from 16 to 32 points at 600 points of available window width.
  useWindowDimensions updates the layout on resizing and rotation.
- Scrolling is enabled by default. Set scrollable={false} when a child such as
  FlatList owns scrolling; do not nest a vertical list in the default ScrollView.
- EmptyState, LoadingState and ErrorState are presentational content. Use them
  inside ScreenContainer for a whole screen, or in an already padded parent.
  They grow into available space without forcing fixed heights or hiding overflow.
- AppButton provides disabled/busy semantics, pressed feedback, a minimum 48-point
  touch target, and a label that wraps. It never starts work on its own.
- SectionCard groups content with an optional accessible heading.
- Badge displays a noninteractive text label and wraps within available width.

Text uses native font scaling without a maximum scale or single-line clipping.
Messages, long identifiers, button labels and headings wrap. No device model,
platform-specific dimensions, fixed screen height, or network logic is involved.
The small palette is light; it is not a full theme system.

Validation uses npm run typecheck, npm run lint, and the existing Jest startup test.
These checks do not prove native layout or screen-reader behavior. No emulator or
device is launched for this step. Future visual checks should cover small phones,
landscape, tablet widths, large text, notches, and VoiceOver/TalkBack.

References:

- https://reactnative.dev/docs/usewindowdimensions
- https://reactnavigation.org/docs/handling-safe-area/
