import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme/tokens";

type Props = {
  children: React.ReactNode;
  /** Pad the bottom for the tab bar (default false — tabs add their own inset). */
  scroll?: boolean;
  edges?: { top?: boolean; bottom?: boolean };
  style?: ViewStyle;
};

/**
 * Full-bleed app screen. Edge-to-edge background with safe-area padding applied
 * explicitly so content never collides with the notch or home indicator.
 */
export function Screen({ children, edges = { top: true, bottom: false }, style }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: edges.top ? insets.top : 0,
          paddingBottom: edges.bottom ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
  },
});
