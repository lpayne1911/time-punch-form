import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { AppHeader } from "@/components/ui/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { colors, font, radius, spacing } from "@/theme/tokens";
import { api } from "@/lib/api";
import { useAsyncData } from "@/lib/useAsyncData";
import type { MatchRow } from "@/lib/types";

const SECTIONS: { bucket: MatchRow["bucket"]; title: string; hint?: string }[] = [
  { bucket: "new", title: "New", hint: "You matched — start the conversation." },
  { bucket: "yourTurn", title: "Your turn", hint: "They're waiting to hear back." },
  { bucket: "waiting", title: "Waiting on them" },
];

export default function Matches() {
  const router = useRouter();
  const { data, loading, refreshing, error, refresh, reload } = useAsyncData(
    useCallback(() => api.matches(), []),
  );

  const rows = data?.matches ?? [];

  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Matches" subtitle="Conversations start with consent" />
      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <EmptyState icon="cloud-offline-outline" title="Can't load Matches" body={error}>
          <Button label="Try again" onPress={reload} />
        </EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="No matches yet"
          body="When you and another member both express interest, your conversation opens here with a gentle 48-hour window to say hello."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        >
          {SECTIONS.map((s) => {
            const sectionRows = rows.filter((r) => r.bucket === s.bucket);
            if (sectionRows.length === 0) return null;
            return (
              <View key={s.bucket} style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {s.title} <Text style={styles.count}>({sectionRows.length})</Text>
                </Text>
                {s.hint ? <Text style={styles.hint}>{s.hint}</Text> : null}
                {sectionRows.map((r) => (
                  <MatchListRow
                    key={r.id}
                    row={r}
                    onPress={() => router.push({ pathname: "/messages/[matchId]", params: { matchId: r.id } })}
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

function MatchListRow({ row, onPress }: { row: MatchRow; onPress: () => void }) {
  const monogram = row.name.trim().charAt(0).toUpperCase() || "·";
  const quiet = row.quietDays !== null && row.quietDays >= 3;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{monogram}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>
          {row.name}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {row.preview}
        </Text>
        {quiet ? (
          <Text style={styles.quiet}>Quiet for {row.quietDays} days — a thoughtful follow-up could help.</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingBottom: 24, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: font.size.lg, fontWeight: font.weight.semibold },
  count: { color: colors.inkFaint, fontSize: font.size.sm, fontWeight: font.weight.regular },
  hint: { color: colors.inkFaint, fontSize: font.size.xs, marginTop: -4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowPressed: { backgroundColor: colors.card2 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(201,139,171,0.12)",
    borderWidth: 1,
    borderColor: "rgba(201,139,171,0.3)",
  },
  avatarText: { color: colors.accentSoft, fontSize: 20, fontWeight: font.weight.semibold },
  rowBody: { flex: 1, gap: 2 },
  name: { color: colors.ink, fontSize: font.size.md, fontWeight: font.weight.semibold },
  preview: { color: colors.inkSoft, fontSize: font.size.sm },
  quiet: { color: colors.gold, fontSize: font.size.xs, marginTop: 2 },
});
