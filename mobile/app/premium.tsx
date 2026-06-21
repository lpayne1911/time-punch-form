import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { colors, font, radius, spacing } from "@/theme/tokens";
import { api, ApiError } from "@/lib/api";
import type { BillingData, Interval, Tier } from "@/lib/types";

const FEATURE_LABELS: Record<string, string> = {
  unlimitedLikes: "Unlimited likes",
  seeWhoLikedYou: "See who likes you",
  readReceipts: "Read receipts",
  moreDailyRecs: "More daily recommendations",
  incognito: "Incognito browsing",
  verifiedOnlyBrowsing: "Verified-only browsing",
  travelMode: "Travel mode",
  advancedFilters: "Advanced filters",
  hideFromDiscovery: "Hide from discovery",
  profileVisibilityAudit: "Profile visibility audit",
  privateCircles: "Private circles",
  priorityProfileReview: "Priority profile review",
  conciergeSupport: "Concierge support",
};

export default function Premium() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState<Interval>("MONTH");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.billing());
    } catch {
      // leave null; show retry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function subscribe(tier: Tier) {
    setBusy(tier);
    try {
      await api.subscribe(tier, interval);
      await load();
      Alert.alert("You're upgraded", "Your new benefits are active.");
    } catch (e) {
      Alert.alert(
        "Couldn't upgrade",
        e instanceof ApiError ? e.message : "In production this completes through the App Store / Google Play.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function purchase(kind: "BOOST" | "SUPER_LIKE" | "TRAVEL_PASS") {
    setBusy(kind);
    try {
      await api.purchase(kind);
      Alert.alert("Added", "Your purchase is ready to use.");
    } catch (e) {
      Alert.alert("Couldn't purchase", e instanceof ApiError ? e.message : "Try again in a moment.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Membership</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : !data ? (
        <View style={styles.center}>
          <Button label="Retry" variant="ghost" onPress={load} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            Velvet only ever charges for privacy, discovery, and convenience — never access to a
            person or content. Safety tools are always free.
          </Text>

          <View style={styles.toggle}>
            {(["MONTH", "YEAR"] as Interval[]).map((iv) => (
              <Pressable
                key={iv}
                onPress={() => setInterval(iv)}
                style={[styles.toggleBtn, interval === iv && styles.toggleActive]}
              >
                <Text style={[styles.toggleText, interval === iv && styles.toggleTextActive]}>
                  {iv === "MONTH" ? "Monthly" : "Annual"}
                </Text>
              </Pressable>
            ))}
          </View>

          {data.tiers.map((t) => {
            const isCurrent = data.tier === t.id;
            const price = interval === "YEAR" ? t.annual : t.monthly;
            return (
              <View key={t.id} style={[styles.tier, isCurrent && styles.tierCurrent]}>
                <View style={styles.tierHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tierName}>{t.name}</Text>
                    <Text style={styles.tierForWho}>{t.forWho}</Text>
                  </View>
                  <View style={styles.tierPriceWrap}>
                    <Text style={styles.tierPrice}>{price === 0 ? "Free" : `$${price}`}</Text>
                    {price > 0 ? (
                      <Text style={styles.tierPer}>/{interval === "YEAR" ? "yr" : "mo"}</Text>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.tierBlurb}>{t.blurb}</Text>
                {interval === "YEAR" && t.annualSavingsPct > 0 ? (
                  <Text style={styles.savings}>Save {t.annualSavingsPct}% vs monthly</Text>
                ) : null}

                {t.features.length > 0 ? (
                  <View style={styles.features}>
                    {t.features.map((f) => (
                      <View key={f} style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={15} color={colors.accent} />
                        <Text style={styles.featureText}>{FEATURE_LABELS[f] ?? f}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {isCurrent ? (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Your plan</Text>
                  </View>
                ) : t.id !== "FREE" ? (
                  <View style={styles.tierAction}>
                    <Button
                      label={`Choose ${t.name}`}
                      loading={busy === t.id}
                      onPress={() => subscribe(t.id)}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}

          <Text style={styles.sectionTitle}>One-time add-ons</Text>
          {data.shop.map((item) => (
            <View key={item.kind} style={styles.shopItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName}>{item.name}</Text>
                <Text style={styles.shopDesc}>{item.description}</Text>
              </View>
              <View style={styles.shopAction}>
                <Button
                  label={`$${(item.priceCents / 100).toFixed(2)}`}
                  variant="ghost"
                  loading={busy === item.kind}
                  onPress={() => purchase(item.kind)}
                />
              </View>
            </View>
          ))}

          <Text style={styles.footer}>
            On iOS and Android, purchases are processed by the App Store and Google Play.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, color: colors.ink, fontSize: font.size.lg, fontWeight: font.weight.semibold, textAlign: "center" },
  content: { padding: spacing.md, paddingBottom: 48, gap: spacing.md },
  intro: { color: colors.inkSoft, fontSize: font.size.sm, lineHeight: 21 },
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radius.pill },
  toggleActive: { backgroundColor: colors.accent },
  toggleText: { color: colors.inkSoft, fontSize: font.size.sm, fontWeight: font.weight.semibold },
  toggleTextActive: { color: colors.bg },
  tier: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 8,
  },
  tierCurrent: { borderColor: colors.accent },
  tierHead: { flexDirection: "row", alignItems: "flex-start" },
  tierName: { color: colors.ink, fontSize: font.size.xl, fontWeight: font.weight.semibold },
  tierForWho: { color: colors.inkFaint, fontSize: font.size.xs, marginTop: 2 },
  tierPriceWrap: { flexDirection: "row", alignItems: "flex-end" },
  tierPrice: { color: colors.accentSoft, fontSize: font.size.xl, fontWeight: font.weight.bold },
  tierPer: { color: colors.inkFaint, fontSize: font.size.xs, marginBottom: 4 },
  tierBlurb: { color: colors.inkSoft, fontSize: font.size.sm, lineHeight: 20 },
  savings: { color: colors.gold, fontSize: font.size.xs, fontWeight: font.weight.medium },
  features: { gap: 6, marginTop: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { color: colors.inkSoft, fontSize: font.size.sm },
  currentBadge: { alignSelf: "flex-start", marginTop: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: "rgba(201,139,171,0.14)" },
  currentBadgeText: { color: colors.accent, fontSize: font.size.xs, fontWeight: font.weight.semibold },
  tierAction: { marginTop: 6 },
  sectionTitle: { color: colors.ink, fontSize: font.size.lg, fontWeight: font.weight.semibold, marginTop: spacing.sm },
  shopItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  shopName: { color: colors.ink, fontSize: font.size.md, fontWeight: font.weight.semibold },
  shopDesc: { color: colors.inkFaint, fontSize: font.size.xs, lineHeight: 17, marginTop: 2 },
  shopAction: { minWidth: 92 },
  footer: { color: colors.inkFaint, fontSize: font.size.xs, textAlign: "center", marginTop: spacing.sm },
});
