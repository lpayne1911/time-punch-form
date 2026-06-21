import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { colors, font } from "@/theme/tokens";
import { useAuth } from "@/lib/auth";

/** Bootstrap gate: route to the age-gate/login flow or into the app. */
export default function Index() {
  const { status, me } = useAuth();

  if (status === "loading") {
    return (
      <View style={styles.splash}>
        <Text style={styles.brand}>VELVET</Text>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (status === "signedOut") return <Redirect href="/(auth)/age-gate" />;
  // Signed in but not through the funnel yet → finish onboarding first.
  if (me?.onboardingNext) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/discover" />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  brand: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: font.weight.semibold,
    letterSpacing: 8,
  },
});
