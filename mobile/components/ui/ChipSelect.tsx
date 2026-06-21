import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, font, radius, spacing } from "@/theme/tokens";

type Props = {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  mode?: "multi" | "single";
  max?: number;
};

/** Tappable chip group for the controlled vocabularies (multi or single select). */
export function ChipSelect({ options, selected, onChange, mode = "multi", max }: Props) {
  function toggle(option: string) {
    const isOn = selected.includes(option);
    if (mode === "single") {
      onChange(isOn ? [] : [option]);
      return;
    }
    if (isOn) {
      onChange(selected.filter((s) => s !== option));
    } else {
      if (max && selected.length >= max) return;
      onChange([...selected, option]);
    }
  }

  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <Pressable
            key={option}
            onPress={() => toggle(option)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipActive: {
    backgroundColor: "rgba(201,139,171,0.16)",
    borderColor: colors.accent,
  },
  text: { color: colors.inkSoft, fontSize: font.size.sm },
  textActive: { color: colors.ink, fontWeight: font.weight.semibold },
});
