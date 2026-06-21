import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, radius, spacing } from "@/theme/tokens";
import { Tag } from "./ui/Tag";
import type { Candidate } from "@/lib/types";

/**
 * A Discover card. Photos are blurred until a mutual match (consent-first,
 * blueprint §10), so the card leads with compatibility — the "why" of the
 * connection — over appearance. A soft monogram stands in for the blurred photo.
 */
export function SwipeCard({ candidate }: { candidate: Candidate }) {
  const verified = candidate.verification !== "UNVERIFIED";
  const monogram = candidate.displayName.trim().charAt(0).toUpperCase() || "·";

  return (
    <View style={styles.card}>
      {/* Blurred "photo" stand-in: a quiet gradient with a monogram. */}
      <LinearGradient colors={["#2a2139", "#1a1326"]} style={styles.photo}>
        <View style={styles.monogramRing}>
          <Text style={styles.monogram}>{monogram}</Text>
        </View>
        {candidate.photoBlurred ? (
          <View style={styles.blurNote}>
            <Ionicons name="lock-closed" size={12} color={colors.inkSoft} />
            <Text style={styles.blurNoteText}>Photo unlocks on match</Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* Bottom scrim for legibility. */}
      <LinearGradient
        colors={["transparent", "rgba(16,11,22,0.96)"]}
        style={styles.scrim}
        pointerEvents="none"
      />

      <View style={styles.info}>
        <View style={styles.fitRow}>
          <View style={styles.fitBadge}>
            <Ionicons name="heart-circle-outline" size={14} color={colors.accent} />
            <Text style={styles.fitText}>{candidate.fit}</Text>
          </View>
          {verified ? (
            <View style={styles.verified}>
              <Ionicons name="shield-checkmark" size={13} color={colors.gold} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {candidate.displayName}
          {candidate.ageLabel ? <Text style={styles.age}>  {candidate.ageLabel}</Text> : null}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.inkFaint} />
          <Text style={styles.meta} numberOfLines={1}>
            {candidate.location}
            {candidate.experienceLevel ? `  ·  ${candidate.experienceLevel}` : ""}
          </Text>
        </View>

        <Text style={styles.reason} numberOfLines={2}>
          {candidate.reason}
        </Text>

        <View style={styles.tags}>
          {candidate.intentions.slice(0, 2).map((t) => (
            <Tag key={`i-${t}`} label={t} tone="accent" />
          ))}
          {candidate.interests.slice(0, 3).map((t) => (
            <Tag key={`x-${t}`} label={t} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  photo: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  monogramRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(201,139,171,0.10)",
    borderWidth: 1,
    borderColor: "rgba(201,139,171,0.28)",
  },
  monogram: { color: colors.accentSoft, fontSize: 52, fontWeight: font.weight.semibold },
  blurNote: {
    position: "absolute",
    top: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  blurNoteText: { color: colors.inkSoft, fontSize: font.size.xs },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "62%" },
  info: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.lg, gap: 6 },
  fitRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 2 },
  fitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(201,139,171,0.16)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fitText: { color: colors.accentSoft, fontSize: font.size.xs, fontWeight: font.weight.semibold },
  verified: { flexDirection: "row", alignItems: "center", gap: 5 },
  verifiedText: { color: colors.gold, fontSize: font.size.xs, fontWeight: font.weight.medium },
  name: { color: colors.ink, fontSize: font.size.xxl, fontWeight: font.weight.semibold },
  age: { color: colors.inkSoft, fontSize: font.size.lg, fontWeight: font.weight.regular },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { color: colors.inkFaint, fontSize: font.size.sm },
  reason: { color: colors.inkSoft, fontSize: font.size.md, lineHeight: 21, marginTop: 4 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
});
