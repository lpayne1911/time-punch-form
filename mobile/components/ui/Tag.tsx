import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, font, radius, spacing } from "@/theme/tokens";

type Props = { label: string; tone?: "default" | "accent" | "gold" };

/** Small rounded chip for interests / intentions / verification badges. */
export function Tag({ label, tone = "default" }: Props) {
  return (
    <View style={[styles.tag, tone === "accent" && styles.accent, tone === "gold" && styles.gold]}>
      <Text style={[styles.text, tone === "gold" && styles.goldText]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.cardBorderSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  accent: {
    backgroundColor: "rgba(201,139,171,0.14)",
    borderColor: colors.accentDeep,
  },
  gold: {
    backgroundColor: "rgba(212,182,129,0.12)",
    borderColor: "rgba(212,182,129,0.4)",
  },
  text: { color: colors.inkSoft, fontSize: font.size.xs, fontWeight: font.weight.medium },
  goldText: { color: colors.gold },
});
