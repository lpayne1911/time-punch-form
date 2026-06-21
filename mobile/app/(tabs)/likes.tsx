import React, { useCallback } from "react";
import {
  ActivityIndicator,
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
import { Tag } from "@/components/ui/Tag";
import { colors, font, radius, spacing } from "@/theme/tokens";
import { api } from "@/lib/api";
import { useAsyncData } from "@/lib/useAsyncData";
import type { IncomingLike } from "@/lib/types";

export default function Likes() {
  const router = useRouter();
  const { data, loading, refreshing, error, refresh, reload } = useAsyncData(
    useCallback(() => api.likes(), []),
  );

  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Likes" subtitle="Members who chose you first" />
      {loading && !data ? (
        <Centered />
      ) : error ? (
        <EmptyState icon="cloud-offline-outline" title="Can't load Likes" body={error}>
          <Button label="Try again" onPress={reload} />
        </EmptyState>
      ) : !data?.entitled ? (
        <LockedUpsell count={data?.count ?? 0} onUpgrade={() => router.push("/premium")} />
      ) : data.likes.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="No new interest yet"
          body="When someone likes you, they'll appear here. Like them back to open a private connection."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        >
          <Text style={styles.lede}>These members already expressed interest. Like back to match.</Text>
          {data.likes.map((l) => (
            <LikeRow key={l.userId} like={l} />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

function LikeRow({ like }: { like: IncomingLike }) {
  const monogram = like.displayName.trim().charAt(0).toUpperCase() || "·";
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{monogram}</Text>
        {like.superLike ? (
          <View style={styles.starBadge}>
            <Ionicons name="star" size={11} color={colors.bg} />
          </View>
        ) : null}
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>
          {like.displayName}
          {like.ageLabel ? <Text style={styles.age}>  {like.ageLabel}</Text> : null}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {like.location}
        </Text>
        <View style={styles.tags}>
          {like.intentions.slice(0, 2).map((t) => (
            <Tag key={t} label={t} tone="accent" />
          ))}
          {like.interests.slice(0, 1).map((t) => (
            <Tag key={t} label={t} />
          ))}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
    </View>
  );
}

function LockedUpsell({ count, onUpgrade }: { count: number; onUpgrade: () => void }) {
  return (
    <View style={styles.locked}>
      <View style={styles.bigCount}>
        <Text style={styles.bigCountText}>{count}</Text>
      </View>
      <Text style={styles.lockedTitle}>
        {count === 1 ? "Someone has" : `${count} people have`} expressed interest
      </Text>
      <Text style={styles.lockedBody}>
        Upgrade to Plus to see who they are and connect instantly.
      </Text>
      <View style={styles.lockedAction}>
        <Button label="See who likes you" onPress={onUpgrade} />
      </View>
    </View>
  );
}

function Centered() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingBottom: 24, gap: spacing.sm },
  lede: { color: colors.inkSoft, fontSize: font.size.sm, marginBottom: spacing.xs },
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
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(201,139,171,0.12)",
    borderWidth: 1,
    borderColor: "rgba(201,139,171,0.3)",
  },
  avatarText: { color: colors.accentSoft, fontSize: 22, fontWeight: font.weight.semibold },
  starBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.card,
  },
  rowBody: { flex: 1, gap: 3 },
  name: { color: colors.ink, fontSize: font.size.md, fontWeight: font.weight.semibold },
  age: { color: colors.inkSoft, fontWeight: font.weight.regular },
  meta: { color: colors.inkFaint, fontSize: font.size.xs },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 4 },
  locked: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.xl },
  bigCount: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(201,139,171,0.12)",
    borderWidth: 1,
    borderColor: "rgba(201,139,171,0.3)",
    marginBottom: spacing.sm,
  },
  bigCountText: { color: colors.accent, fontSize: 40, fontWeight: font.weight.bold },
  lockedTitle: { color: colors.ink, fontSize: font.size.lg, fontWeight: font.weight.semibold, textAlign: "center" },
  lockedBody: { color: colors.inkFaint, fontSize: font.size.sm, textAlign: "center", lineHeight: 21, maxWidth: 280 },
  lockedAction: { alignSelf: "stretch", marginTop: spacing.md },
});
