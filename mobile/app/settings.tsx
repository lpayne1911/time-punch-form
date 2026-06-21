import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { colors, font, radius, spacing } from "@/theme/tokens";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { SettingsData, Visibility } from "@/lib/types";

const VISIBILITY_OPTIONS: { value: Visibility; label: string; hint: string }[] = [
  { value: "PUBLIC_MEMBERS", label: "All members", hint: "Any signed-in member can find you." },
  { value: "VERIFIED_ONLY", label: "Verified only", hint: "Only verified members can find you." },
  { value: "MATCHES_ONLY", label: "Matches only", hint: "You're hidden from Discover entirely." },
];

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setData(await api.settings());
    } catch {
      // show retry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(key: keyof SettingsData, value: boolean) {
    if (!data) return;
    const prev = data;
    setData({ ...data, [key]: value }); // optimistic
    try {
      await api.updateSetting(key, value);
    } catch (e) {
      setData(prev); // revert
      if (e instanceof ApiError && e.status === 402) {
        Alert.alert("Premium feature", e.message, [
          { text: "Not now", style: "cancel" },
          { text: "See plans", onPress: () => router.push("/premium") },
        ]);
      } else {
        Alert.alert("Couldn't update", e instanceof ApiError ? e.message : "Try again.");
      }
    }
  }

  async function setVisibility(value: Visibility) {
    if (!data) return;
    const prev = data;
    setData({ ...data, visibility: value });
    try {
      await api.updateSetting("visibility", value);
    } catch (e) {
      setData(prev);
      Alert.alert("Couldn't update", e instanceof ApiError ? e.message : "Try again.");
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings & Safety</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading || !data ? (
        <View style={styles.center}>
          {loading ? <ActivityIndicator color={colors.accent} /> : <Button label="Retry" variant="ghost" onPress={load} />}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Section title="Privacy">
            <ToggleRow
              icon="eye-off-outline"
              label="Incognito"
              hint="Browse without appearing in Discover."
              premium={!data.features.includes("incognito")}
              value={data.incognito}
              onValueChange={(v) => toggle("incognito", v)}
            />
            <ToggleRow
              icon="remove-circle-outline"
              label="Hide from discovery"
              hint="Only reachable via direct link or existing matches."
              premium={!data.features.includes("hideFromDiscovery")}
              value={data.hideFromDiscovery}
              onValueChange={(v) => toggle("hideFromDiscovery", v)}
            />
            <ToggleRow
              icon="shield-checkmark-outline"
              label="Verified-only browsing"
              hint="Only see verified members in Discover."
              premium={!data.features.includes("verifiedOnlyBrowsing")}
              value={data.discoverVerifiedOnly}
              onValueChange={(v) => toggle("discoverVerifiedOnly", v)}
            />
            <ToggleRow
              icon="notifications-outline"
              label="Discreet notifications"
              hint="Hide message previews on your lock screen."
              value={data.discreetNotifications}
              onValueChange={(v) => toggle("discreetNotifications", v)}
            />
          </Section>

          <Section title="Who can find you">
            {VISIBILITY_OPTIONS.map((o) => (
              <Pressable key={o.value} style={styles.radioRow} onPress={() => setVisibility(o.value)}>
                <Ionicons
                  name={data.visibility === o.value ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={data.visibility === o.value ? colors.accent : colors.inkFaint}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.radioLabel}>{o.label}</Text>
                  <Text style={styles.hint}>{o.hint}</Text>
                </View>
              </Pressable>
            ))}
          </Section>

          <Section title="Safety">
            <ToggleRow
              icon="pause-circle-outline"
              label="Pause my profile"
              hint="Instantly hide yourself everywhere. Turn off anytime."
              value={data.paused}
              onValueChange={(v) => toggle("paused", v)}
            />
            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
              <Text style={styles.noteText}>
                You can report or block anyone from inside a conversation. Safety tools are always
                free and never gated.
              </Text>
            </View>
          </Section>

          <View style={styles.signOut}>
            <Button label="Sign out" variant="ghost" onPress={signOut} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  value,
  onValueChange,
  premium,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  premium?: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <Ionicons name={icon} size={20} color={colors.inkSoft} />
      <View style={{ flex: 1 }}>
        <View style={styles.labelRow}>
          <Text style={styles.toggleLabel}>{label}</Text>
          {premium ? (
            <View style={styles.premiumChip}>
              <Text style={styles.premiumChipText}>Premium</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.card2, true: colors.accentDeep }}
        thumbColor={value ? colors.accent : colors.inkFaint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, color: colors.ink, fontSize: font.size.lg, fontWeight: font.weight.semibold, textAlign: "center" },
  content: { padding: spacing.md, paddingBottom: 48, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.inkFaint, fontSize: font.size.xs, fontWeight: font.weight.semibold, letterSpacing: 1.5, textTransform: "uppercase" },
  sectionCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorderSoft,
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  toggleLabel: { color: colors.ink, fontSize: font.size.md, fontWeight: font.weight.medium },
  hint: { color: colors.inkFaint, fontSize: font.size.xs, marginTop: 2, lineHeight: 16 },
  premiumChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: "rgba(212,182,129,0.14)" },
  premiumChipText: { color: colors.gold, fontSize: 10, fontWeight: font.weight.semibold },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorderSoft,
  },
  radioLabel: { color: colors.ink, fontSize: font.size.md, fontWeight: font.weight.medium },
  note: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, alignItems: "flex-start" },
  noteText: { flex: 1, color: colors.inkSoft, fontSize: font.size.xs, lineHeight: 18 },
  signOut: { marginTop: spacing.sm },
});
