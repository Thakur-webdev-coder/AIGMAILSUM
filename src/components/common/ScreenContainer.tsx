import React from 'react';
import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import { colors, layout, spacing } from '../../constants/ui';

interface ScreenContainerProps {
  children: ReactNode;
  /** Exclude edges already covered by a non-transparent navigation header/tab bar. */
  safeAreaEdges?: readonly Edge[];
  /** Disable when the screen's child owns scrolling, such as a FlatList. */
  scrollable?: boolean;
}

const allEdges: readonly Edge[] = ['top', 'right', 'bottom', 'left'];

export function ScreenContainer({
  children,
  safeAreaEdges = allEdges,
  scrollable = true,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const availableWidth = width - insets.left - insets.right;
  const gutter =
    availableWidth >= layout.tabletBreakpoint ? spacing.xxl : spacing.lg;
  const contentStyle = [styles.content, { paddingHorizontal: gutter }];
  const safeAreaStyle = {
    paddingTop: safeAreaEdges.includes('top') ? insets.top : 0,
    paddingRight: safeAreaEdges.includes('right') ? insets.right : 0,
    paddingBottom: safeAreaEdges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: safeAreaEdges.includes('left') ? insets.left : 0,
  };

  return (
    <View style={[styles.screen, safeAreaStyle]}>
      {scrollable ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={contentStyle}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[contentStyle, styles.fill]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
});
