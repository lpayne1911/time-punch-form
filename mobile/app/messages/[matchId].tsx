import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, radius, spacing } from "@/theme/tokens";
import { api, ApiError } from "@/lib/api";
import type { ThreadData, ThreadMessage } from "@/lib/types";

export default function MessageThread() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [thread, setThread] = useState<ThreadData | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.thread(matchId);
      setThread(data);
      setMessages(data.messages);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't open this conversation.");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    load();
  }, [load]);

  const scrollToEnd = () => requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  async function send(text?: string) {
    const body = (text ?? draft).trim();
    if (!body || !matchId || sending) return;
    setSending(true);
    setDraft("");
    try {
      const res = await api.sendMessage(matchId, body);
      setMessages((prev) => [...prev, res.message]);
      scrollToEnd();
      if (res.heldForReview) {
        Alert.alert("Held for review", "This message is pending a quick safety review before it's delivered.");
      } else if (res.nudgeContactInfo) {
        Alert.alert("A gentle reminder", "Keep early conversations on Velvet — it's safer until you've built trust.");
      }
    } catch (e) {
      setDraft(body);
      Alert.alert("Couldn't send", e instanceof ApiError ? e.message : "Try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  function openSafetyMenu() {
    if (!thread) return;
    Alert.alert("Safety", `Options for your conversation with ${thread.otherName}`, [
      {
        text: "Report",
        style: "destructive",
        onPress: () =>
          Alert.alert("Report member", "Send this to the moderation team?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Report",
              style: "destructive",
              onPress: async () => {
                try {
                  await api.report(thread.otherId, "HARASSMENT");
                  Alert.alert("Reported", "Thank you — our team will review this.");
                } catch {
                  Alert.alert("Couldn't report", "Try again in a moment.");
                }
              },
            },
          ]),
      },
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          try {
            await api.block(thread.otherId);
            Alert.alert("Blocked", "You won't see each other again.");
            router.back();
          } catch {
            Alert.alert("Couldn't block", "Try again in a moment.");
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {thread?.otherName ?? "Conversation"}
        </Text>
        <Pressable onPress={openSafetyMenu} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.inkSoft} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.messages}
            onContentSizeChange={scrollToEnd}
            showsVerticalScrollIndicator={false}
          >
            {thread?.expiresAt ? (
              <Text style={styles.systemNote}>
                You matched — say hello before the intro window closes.
              </Text>
            ) : null}

            {messages.length === 0 && thread?.starters?.length ? (
              <View style={styles.starters}>
                <Text style={styles.startersTitle}>Conversation starters</Text>
                {thread.starters.map((s) => (
                  <Pressable key={s} style={styles.starter} onPress={() => send(s)}>
                    <Text style={styles.starterText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {messages.map((m) => (
              <View key={m.id} style={[styles.bubbleRow, m.mine ? styles.mineRow : styles.theirsRow]}>
                <View style={[styles.bubble, m.mine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.bubbleText, m.mine && styles.mineText]}>{m.body}</Text>
                  {m.quarantined ? <Text style={styles.pending}>Pending review</Text> : null}
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            style={styles.input}
            placeholder={`Message ${thread?.otherName ?? ""}`}
            placeholderTextColor={colors.inkFaint}
            value={draft}
            onChangeText={setDraft}
            multiline
            editable={!thread?.alreadyBlocked}
          />
          <Pressable
            onPress={() => send()}
            disabled={!draft.trim() || sending}
            style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDim]}
          >
            <Ionicons name="arrow-up" size={20} color={colors.bg} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: colors.danger, fontSize: font.size.sm },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorderSoft,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, color: colors.ink, fontSize: font.size.lg, fontWeight: font.weight.semibold, textAlign: "center" },
  messages: { padding: spacing.md, gap: spacing.xs },
  systemNote: { color: colors.inkFaint, fontSize: font.size.xs, textAlign: "center", marginVertical: spacing.sm },
  starters: { gap: spacing.sm, marginBottom: spacing.md },
  startersTitle: { color: colors.inkFaint, fontSize: font.size.xs, fontWeight: font.weight.semibold, letterSpacing: 1, textTransform: "uppercase" },
  starter: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  starterText: { color: colors.inkSoft, fontSize: font.size.sm, lineHeight: 20 },
  bubbleRow: { flexDirection: "row" },
  mineRow: { justifyContent: "flex-end" },
  theirsRow: { justifyContent: "flex-start" },
  bubble: { maxWidth: "80%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  mine: { backgroundColor: colors.accent, borderBottomRightRadius: 5 },
  theirs: { backgroundColor: colors.card2, borderBottomLeftRadius: 5, borderWidth: 1, borderColor: colors.cardBorderSoft },
  bubbleText: { color: colors.ink, fontSize: font.size.md, lineHeight: 21 },
  mineText: { color: colors.bg },
  pending: { color: "rgba(16,11,22,0.6)", fontSize: font.size.xs, marginTop: 4, fontStyle: "italic" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorderSoft,
    backgroundColor: colors.bg2,
  },
  input: {
    flex: 1,
    color: colors.ink,
    fontSize: font.size.md,
    maxHeight: 120,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDim: { opacity: 0.4 },
});
