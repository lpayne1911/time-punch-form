import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, font, spacing } from "@/theme/tokens";

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

/** App-style header row: 56pt tall, brand-spaced title, optional trailing slot. */
export function AppHeader({ title, subtitle, right }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  titleWrap: { flexShrink: 1 },
  title: {
    color: colors.ink,
    fontSize: font.size.xxl,
    fontWeight: font.weight.semibold,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: colors.inkFaint,
    fontSize: font.size.sm,
    marginTop: 2,
  },
});
