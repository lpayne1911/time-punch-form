import React from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./ui/Button";
import { colors, font, radius, spacing } from "@/theme/tokens";
import type { Candidate } from "@/lib/types";

/**
 * Shown on a mutual match. Warm but restrained — messaging opens elsewhere; this
 * just celebrates the consent-confirmed connection (both sides chose each other).
 */
export function MatchOverlay({
  candidate,
  onClose,
}: {
  candidate: Candidate | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!candidate} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <LinearGradient colors={["#2a2139", "#160f1e"]} style={styles.sheet}>
          <Ionicons name="heart-circle" size={56} color={colors.accent} />
          <Text style={styles.kicker}>It's mutual</Text>
          <Text style={styles.title}>You and {candidate?.displayName} connected</Text>
          <Text style={styles.body}>
            You both chose to connect. Say hello when you're ready — photos unlock now that there's
            mutual interest.
          </Text>
          <View style={styles.actions}>
            <Button label="Keep discovering" onPress={onClose} />
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8,5,12,0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  kicker: {
    color: colors.accentSoft,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: spacing.sm,
  },
  title: {
    color: colors.ink,
    fontSize: font.size.xl,
    fontWeight: font.weight.semibold,
    textAlign: "center",
  },
  body: { color: colors.inkSoft, fontSize: font.size.sm, textAlign: "center", lineHeight: 21 },
  actions: { alignSelf: "stretch", marginTop: spacing.md },
});
