import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, font, gradients, radius, spacing } from "@/theme/tokens";
import { haptic } from "@/lib/haptics";

type Variant = "primary" | "ghost" | "danger";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

/** Native-feeling app control: gradient primary, outlined ghost, soft danger. */
export function Button({ label, onPress, variant = "primary", loading, disabled, style }: Props) {
  const isDisabled = disabled || loading;
  const handlePress = () => {
    if (isDisabled) return;
    haptic.press();
    onPress();
  };

  const content = loading ? (
    <ActivityIndicator color={variant === "primary" ? colors.bg : colors.accent} />
  ) : (
    <Text style={[styles.label, variant === "primary" ? styles.labelPrimary : styles.labelInk]}>
      {label}
    </Text>
  );

  if (variant === "primary") {
    return (
      <Pressable onPress={handlePress} disabled={isDisabled} style={[styles.base, style, isDisabled && styles.dim]}>
        <LinearGradient
          colors={gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={[
        styles.base,
        styles.fill,
        variant === "danger" ? styles.danger : styles.ghost,
        isDisabled && styles.dim,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  fill: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  danger: {
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: "transparent",
  },
  dim: { opacity: 0.5 },
  label: { fontSize: font.size.md, fontWeight: font.weight.semibold },
  labelPrimary: { color: colors.bg },
  labelInk: { color: colors.ink },
});
