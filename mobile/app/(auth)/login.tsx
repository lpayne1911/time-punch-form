import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { colors, font, radius, spacing } from "@/theme/tokens";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Step = "email" | "code";

/** Passwordless email login. Mirrors the web OTP flow against /api/auth/*. */
export default function Login() {
  const router = useRouter();
  const { completeSignIn } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.requestCode(email.trim().toLowerCase());
      setDevCode(res.devCode);
      setStep("code");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't send a code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setError(null);
    setLoading(true);
    try {
      await api.verifyCode(email.trim().toLowerCase(), code.trim());
      await completeSignIn();
      // Let the bootstrap router decide: onboarding funnel or straight to Discover.
      router.replace("/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "That code didn't work.");
    } finally {
      setLoading(false);
    }
  }

  async function demoLogin() {
    setError(null);
    setLoading(true);
    try {
      await api.demoLogin();
      await completeSignIn();
      router.replace("/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Test login isn't available.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen edges={{ top: true, bottom: true }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.body}>
          <Text style={styles.title}>{step === "email" ? "Sign in" : "Enter your code"}</Text>
          <Text style={styles.sub}>
            {step === "email"
              ? "We'll email you a 6-digit code. No passwords."
              : `We sent a code to ${email}.`}
          </Text>

          {step === "email" ? (
            <View style={styles.field}>
              <Ionicons name="mail-outline" size={18} color={colors.inkFaint} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.inkFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={requestCode}
                returnKeyType="next"
              />
            </View>
          ) : (
            <View style={styles.field}>
              <Ionicons name="keypad-outline" size={18} color={colors.inkFaint} />
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="000000"
                placeholderTextColor={colors.inkFaint}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                onSubmitEditing={verify}
                returnKeyType="done"
              />
            </View>
          )}

          {devCode ? <Text style={styles.devCode}>Preview code: {devCode}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.actions}>
          {step === "email" ? (
            <>
              <Button
                label="Send code"
                onPress={requestCode}
                loading={loading}
                disabled={!email.includes("@")}
              />
              <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.line} />
              </View>
              <Button label="Continue with a test account" variant="ghost" onPress={demoLogin} loading={loading} />
            </>
          ) : (
            <>
              <Button label="Verify & enter" onPress={verify} loading={loading} disabled={code.length !== 6} />
              <Button label="Use a different email" variant="ghost" onPress={() => setStep("email")} />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { flex: 1, justifyContent: "center", gap: spacing.sm },
  title: { color: colors.ink, fontSize: font.size.xxl, fontWeight: font.weight.semibold },
  sub: { color: colors.inkSoft, fontSize: font.size.sm, marginBottom: spacing.md, lineHeight: 20 },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginVertical: 2 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.cardBorder },
  dividerText: { color: colors.inkFaint, fontSize: font.size.xs },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, color: colors.ink, fontSize: font.size.md, paddingVertical: 16 },
  codeInput: { letterSpacing: 8, fontSize: font.size.xl },
  devCode: { color: colors.gold, fontSize: font.size.sm, marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: font.size.sm, marginTop: spacing.sm },
  actions: { gap: spacing.sm, paddingBottom: spacing.lg },
});
