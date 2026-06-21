import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { AppHeader } from "@/components/ui/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SwipeDeck } from "@/components/SwipeDeck";
import { MatchOverlay } from "@/components/MatchOverlay";
import { colors, font } from "@/theme/tokens";
import { api, ApiError } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import type { Candidate, SwipeDirection } from "@/lib/types";

export default function Discover() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<Candidate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.discover();
      setCandidates(res.candidates);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load Discover.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onDecision = useCallback(async (candidate: Candidate, direction: SwipeDirection) => {
    if (direction === "left") return; // pass — nothing to record
    try {
      const res =
        direction === "up"
          ? await api.superlike(candidate.userId)
          : await api.like(candidate.userId);
      if (res.matched) {
        haptic.success();
        setMatch(candidate);
      }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 402 || e.code === "limit_reached")) {
        haptic.warn();
        Alert.alert("Daily likes reached", e.message, [{ text: "Got it" }]);
      }
      // Other transient errors are non-blocking for the swipe UX.
    }
  }, []);

  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Discover" subtitle="Matched on values, not looks" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Finding compatible members…</Text>
        </View>
      ) : error ? (
        <EmptyState icon="cloud-offline-outline" title="Can't load Discover" body={error}>
          <Button label="Try again" onPress={load} />
        </EmptyState>
      ) : candidates.length === 0 ? (
        <EmptyState
          icon="sparkles-outline"
          title="You're all caught up"
          body="New compatible members appear as the community grows. Check back soon, or refine your profile to widen your matches."
        >
          <Button label="Refresh" variant="ghost" onPress={load} />
        </EmptyState>
      ) : (
        <SwipeDeck candidates={candidates} onDecision={onDecision} />
      )}

      <MatchOverlay candidate={match} onClose={() => setMatch(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: colors.inkFaint, fontSize: font.size.sm },
});
