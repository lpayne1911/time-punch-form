import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { AppHeader } from "@/components/ui/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { colors, font, radius, spacing } from "@/theme/tokens";
import { api, ApiError } from "@/lib/api";
import { useAsyncData } from "@/lib/useAsyncData";
import { haptic } from "@/lib/haptics";
import type { EventItem } from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const hr12 = h % 12 || 12;
  return `${MONTHS[d.getMonth()]} ${d.getDate()} · ${hr12}:${m} ${ampm}`;
}

export default function Events() {
  const { data, loading, refreshing, error, refresh, reload, setData } = useAsyncData(
    useCallback(() => api.events(), []),
  );
  const [busy, setBusy] = useState<string | null>(null);

  const onToggleRsvp = useCallback(
    async (ev: EventItem) => {
      setBusy(ev.id);
      haptic.press();
      const going = ev.myRsvp === "RESERVED" || ev.myRsvp === "WAITLIST";
      try {
        const res = await api.rsvp(ev.id, going ? "cancel" : "rsvp");
        if (data) {
          setData({
            ...data,
            events: data.events.map((e) =>
              e.id === ev.id
                ? {
                    ...e,
                    myRsvp: res.status,
                    attending: e.attending + (res.status === "RESERVED" ? 1 : going ? -1 : 0),
                  }
                : e,
            ),
          });
        }
      } catch (e) {
        Alert.alert("Couldn't update RSVP", e instanceof ApiError ? e.message : "Try again in a moment.");
      } finally {
        setBusy(null);
      }
    },
    [data, setData],
  );

  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Events" subtitle="Hosted, vetted, private" />
      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <EmptyState icon="cloud-offline-outline" title="Can't load Events" body={error}>
          <Button label="Try again" onPress={reload} />
        </EmptyState>
      ) : (data?.events.length ?? 0) === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No events nearby yet"
          body="Verified hosts run private, consent-first gatherings — social mixers, communication workshops, community meetups. When events open near you, they'll appear here."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        >
          {data!.events.map((ev) => {
            const going = ev.myRsvp === "RESERVED" || ev.myRsvp === "WAITLIST";
            return (
              <View key={ev.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.title} numberOfLines={2}>
                    {ev.title}
                  </Text>
                  <View style={styles.price}>
                    <Text style={styles.priceText}>{ev.priceLabel}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="pricetag-outline" size={13} color={colors.inkFaint} />
                  <Text style={styles.meta}>{ev.categoryLabel}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={13} color={colors.inkFaint} />
                  <Text style={styles.meta}>
                    {formatWhen(ev.startsAt)} · {ev.location}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="people-outline" size={13} color={colors.inkFaint} />
                  <Text style={styles.meta}>
                    Hosted by {ev.hostName} · {ev.attending} attending
                  </Text>
                </View>

                {ev.myRsvp === "WAITLIST" ? (
                  <Text style={styles.waitlist}>You're on the waitlist</Text>
                ) : null}

                <View style={styles.action}>
                  <Button
                    label={going ? "Cancel RSVP" : "RSVP"}
                    variant={going ? "ghost" : "primary"}
                    loading={busy === ev.id}
                    onPress={() => onToggleRsvp(ev)}
                  />
                </View>
              </View>
            );
          })}
          <Text style={styles.footer}>
            Every event is reviewed before listing. No explicit activity, nudity, or solicitation —
            advertised or implied.
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingBottom: 24, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 6,
  },
  cardHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  title: { flex: 1, color: colors.ink, fontSize: font.size.lg, fontWeight: font.weight.semibold },
  price: {
    backgroundColor: "rgba(212,182,129,0.12)",
    borderWidth: 1,
    borderColor: "rgba(212,182,129,0.35)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priceText: { color: colors.gold, fontSize: font.size.xs, fontWeight: font.weight.semibold },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { color: colors.inkFaint, fontSize: font.size.sm, flexShrink: 1 },
  waitlist: { color: colors.gold, fontSize: font.size.xs, marginTop: 4 },
  action: { marginTop: spacing.sm },
  footer: { color: colors.inkFaint, fontSize: font.size.xs, lineHeight: 18, textAlign: "center", paddingHorizontal: spacing.md, marginTop: spacing.sm },
});
