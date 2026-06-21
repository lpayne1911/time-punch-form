import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { colors, font, radius, spacing } from "@/theme/tokens";

/**
 * Consent-first age gate. Self-attested 18+ entry point — provider-backed age
 * assurance happens later in onboarding (blueprint §4). Mature, private framing.
 */
export default function AgeGate() {
  const router = useRouter();

  return (
    <Screen edges={{ top: true, bottom: true }}>
      <View style={styles.body}>
        <Text style={styles.brand}>VELVET</Text>
        <Text style={styles.tagline}>A private club for intentional connection.</Text>

        <View style={styles.card}>
          <View style={styles.lockRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.gold} />
            <Text style={styles.cardTitle}>Adults only · 18+</Text>
          </View>
          <Text style={styles.cardBody}>
            Velvet is a consent-first community for verified adults. By continuing you confirm you
            are at least 18 years old and agree to enter a respectful, private space.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button label="I'm 18 or older — Continue" onPress={() => router.push("/(auth)/login")} />
        <Text style={styles.fine}>Membership is reviewed. Discretion is the standard.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: "center", gap: spacing.lg },
  brand: {
    color: colors.ink,
    fontSize: 38,
    fontWeight: font.weight.semibold,
    letterSpacing: 10,
    textAlign: "center",
  },
  tagline: { color: colors.inkSoft, fontSize: font.size.md, textAlign: "center", lineHeight: 22 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  lockRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardTitle: { color: colors.ink, fontSize: font.size.lg, fontWeight: font.weight.semibold },
  cardBody: { color: colors.inkSoft, fontSize: font.size.sm, lineHeight: 21 },
  actions: { gap: spacing.sm, paddingBottom: spacing.lg },
  fine: { color: colors.inkFaint, fontSize: font.size.xs, textAlign: "center" },
});
