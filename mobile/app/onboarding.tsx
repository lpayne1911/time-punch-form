import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { ChipSelect } from "@/components/ui/ChipSelect";
import { colors, font, radius, spacing } from "@/theme/tokens";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { OnboardingConfig, OnboardingStep, Visibility } from "@/lib/types";

const ORDER = ["age", "consent", "standards", "basics", "profile"] as const;
type StepKey = (typeof ORDER)[number];

const VISIBILITY: { value: Visibility; label: string }[] = [
  { value: "VERIFIED_ONLY", label: "Verified members only" },
  { value: "PUBLIC_MEMBERS", label: "All members" },
  { value: "MATCHES_ONLY", label: "Matches only" },
];

function startIndex(next: string | null | undefined): number {
  if (next?.includes("/age")) return 0;
  if (next?.includes("/consent")) return 1;
  if (next?.includes("/standards")) return 2;
  if (next?.includes("/basics")) return 3;
  return 4;
}

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { me, refresh } = useAuth();

  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [index, setIndex] = useState(() => startIndex(me?.onboardingNext));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-step form state.
  const [over18, setOver18] = useState(false);
  const [dobYear, setDobYear] = useState("");
  const [displayName, setDisplayName] = useState(me?.profile?.displayName ?? "");
  const [location, setLocation] = useState(me?.profile?.location ?? "");
  const [intentions, setIntentions] = useState<string[]>(me?.profile?.intentions ?? []);
  const [interests, setInterests] = useState<string[]>(me?.profile?.interests ?? []);
  const [values, setValues] = useState<string[]>(me?.profile?.values ?? []);
  const [communication, setCommunication] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [experience, setExperience] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>("VERIFIED_ONLY");

  useEffect(() => {
    api.onboardingConfig().then(setConfig).catch(() => setError("Couldn't load onboarding."));
  }, []);

  const step: StepKey = ORDER[index];

  async function finish() {
    await refresh();
    router.replace("/(tabs)/discover");
  }

  function payloadFor(s: StepKey): OnboardingStep | null {
    switch (s) {
      case "age":
        return { step: "age", over18, dobYear: Number(dobYear) };
      case "consent":
        return { step: "consent" };
      case "standards":
        return { step: "standards" };
      case "basics":
        return { step: "basics", displayName: displayName.trim(), location: location.trim(), intentions };
      case "profile":
        return {
          step: "profile",
          interests,
          values,
          communicationStyle: communication,
          lookingFor,
          boundaries: [],
          dealbreakers: [],
          experienceLevel: experience[0],
          visibility,
        };
    }
  }

  const advance = useCallback(() => {
    if (index >= ORDER.length - 1) {
      finish();
    } else {
      setIndex((i) => i + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  async function submit() {
    const payload = payloadFor(step);
    if (!payload) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.onboardingStep(payload);
      advance();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canContinue = useMemo(() => {
    switch (step) {
      case "age": {
        const y = Number(dobYear);
        const yr = new Date().getFullYear();
        return over18 && y >= 1900 && yr - y >= 18 && yr - y <= 120;
      }
      case "basics":
        return displayName.trim().length > 0 && location.trim().length > 0 && intentions.length > 0;
      default:
        return true;
    }
  }, [step, over18, dobYear, displayName, location, intentions]);

  if (!config) {
    return (
      <View style={styles.loading}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.accent} />}
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.progress}>
        {ORDER.map((s, i) => (
          <View key={s} style={[styles.segment, i <= index && styles.segmentOn]} />
        ))}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {step === "age" ? (
            <StepAge
              over18={over18}
              setOver18={setOver18}
              dobYear={dobYear}
              setDobYear={setDobYear}
            />
          ) : null}

          {step === "consent" ? <StepConsent config={config} /> : null}
          {step === "standards" ? <StepStandards config={config} /> : null}

          {step === "basics" ? (
            <StepBasics
              config={config}
              displayName={displayName}
              setDisplayName={setDisplayName}
              location={location}
              setLocation={setLocation}
              intentions={intentions}
              setIntentions={setIntentions}
            />
          ) : null}

          {step === "profile" ? (
            <StepProfile
              config={config}
              interests={interests}
              setInterests={setInterests}
              values={values}
              setValues={setValues}
              communication={communication}
              setCommunication={setCommunication}
              lookingFor={lookingFor}
              setLookingFor={setLookingFor}
              experience={experience}
              setExperience={setExperience}
              visibility={visibility}
              setVisibility={setVisibility}
            />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button
            label={step === "profile" ? "Finish" : step === "consent" || step === "standards" ? "I agree" : "Continue"}
            onPress={submit}
            loading={submitting}
            disabled={!canContinue}
          />
          {step === "profile" ? (
            <Pressable onPress={finish} hitSlop={8} style={styles.skip}>
              <Text style={styles.skipText}>Skip for now — complete later</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ------------------------------- Steps ------------------------------- */

function StepHeader({ kicker, title, body }: { kicker?: string; title: string; body?: string }) {
  return (
    <View style={styles.stepHead}>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

function StepAge({
  over18,
  setOver18,
  dobYear,
  setDobYear,
}: {
  over18: boolean;
  setOver18: (v: boolean) => void;
  dobYear: string;
  setDobYear: (v: string) => void;
}) {
  return (
    <View style={styles.stepBody}>
      <StepHeader
        kicker="Step 1"
        title="Confirm you're an adult"
        body="Velvet is strictly for verified adults. We store only your birth year for a coarse age check — never your full date of birth."
      />
      <Pressable style={styles.checkRow} onPress={() => setOver18(!over18)}>
        <Ionicons
          name={over18 ? "checkbox" : "square-outline"}
          size={24}
          color={over18 ? colors.accent : colors.inkFaint}
        />
        <Text style={styles.checkLabel}>I confirm I am 18 years of age or older.</Text>
      </Pressable>
      <Text style={styles.fieldLabel}>Birth year</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 1990"
        placeholderTextColor={colors.inkFaint}
        keyboardType="number-pad"
        maxLength={4}
        value={dobYear}
        onChangeText={setDobYear}
      />
    </View>
  );
}

function StepConsent({ config }: { config: OnboardingConfig }) {
  const p = config.consentPledge;
  return (
    <View style={styles.stepBody}>
      <StepHeader kicker="Step 2" title={p.title} body={p.intro} />
      <View style={styles.pledgeCard}>
        {p.points.map((point) => (
          <View key={point} style={styles.pledgeRow}>
            <Ionicons name="heart-circle" size={18} color={colors.accent} />
            <Text style={styles.pledgeText}>{point}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.fine}>Tap "I agree" to accept the consent pledge (v{p.version}).</Text>
    </View>
  );
}

function StepStandards({ config }: { config: OnboardingConfig }) {
  const s = config.communityStandards;
  return (
    <View style={styles.stepBody}>
      <StepHeader kicker="Step 3" title={s.title} body={s.intro} />
      {s.sections.map((sec) => (
        <View key={sec.heading} style={styles.standardCard}>
          <Text style={styles.standardHeading}>{sec.heading}</Text>
          <Text style={styles.standardBody}>{sec.body}</Text>
        </View>
      ))}
      <Text style={styles.fine}>Tap "I agree" to accept the community standards (v{s.version}).</Text>
    </View>
  );
}

function StepBasics({
  config,
  displayName,
  setDisplayName,
  location,
  setLocation,
  intentions,
  setIntentions,
}: {
  config: OnboardingConfig;
  displayName: string;
  setDisplayName: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  intentions: string[];
  setIntentions: (v: string[]) => void;
}) {
  const [zip, setZip] = useState("");
  const [looking, setLooking] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);

  async function lookup(code: string) {
    setLooking(true);
    setZipError(null);
    setLocation("");
    try {
      const res = await api.zipLookup(code);
      setLocation(res.location);
    } catch (e) {
      setZipError(e instanceof ApiError ? e.message : "Couldn't look up that ZIP.");
    } finally {
      setLooking(false);
    }
  }

  function onZipChange(v: string) {
    const digits = v.replace(/[^0-9]/g, "").slice(0, 5);
    setZip(digits);
    if (digits.length < 5) {
      setLocation("");
      setZipError(null);
    } else {
      lookup(digits);
    }
  }

  return (
    <View style={styles.stepBody}>
      <StepHeader
        kicker="Step 4"
        title="The basics"
        body="Enough to start exploring. A pseudonym is welcome, and your area stays general — never a precise location."
      />
      <Text style={styles.fieldLabel}>Display name</Text>
      <TextInput
        style={styles.input}
        placeholder="What should members call you?"
        placeholderTextColor={colors.inkFaint}
        maxLength={40}
        value={displayName}
        onChangeText={setDisplayName}
      />

      <Text style={styles.fieldLabel}>ZIP code</Text>
      {!manual ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter your ZIP"
            placeholderTextColor={colors.inkFaint}
            keyboardType="number-pad"
            maxLength={5}
            value={zip}
            onChangeText={onZipChange}
          />
          {looking ? (
            <View style={styles.zipStatus}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.zipStatusText}>Finding your area…</Text>
            </View>
          ) : location ? (
            <View style={styles.zipStatus}>
              <Ionicons name="location" size={15} color={colors.accent} />
              <Text style={styles.zipResolved}>{location}</Text>
            </View>
          ) : zipError ? (
            <Text style={styles.zipError}>{zipError}</Text>
          ) : null}
          <Pressable onPress={() => setManual(true)} hitSlop={6}>
            <Text style={styles.manualLink}>Enter my area manually instead</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="City or region"
            placeholderTextColor={colors.inkFaint}
            maxLength={60}
            value={location}
            onChangeText={setLocation}
          />
          <Pressable onPress={() => { setManual(false); setLocation(""); }} hitSlop={6}>
            <Text style={styles.manualLink}>Use a ZIP code instead</Text>
          </Pressable>
        </>
      )}

      <Text style={styles.fieldLabel}>What are you looking for?</Text>
      <ChipSelect options={config.vocab.intentions} selected={intentions} onChange={setIntentions} />
    </View>
  );
}

function StepProfile({
  config,
  interests,
  setInterests,
  values,
  setValues,
  communication,
  setCommunication,
  lookingFor,
  setLookingFor,
  experience,
  setExperience,
  visibility,
  setVisibility,
}: {
  config: OnboardingConfig;
  interests: string[];
  setInterests: (v: string[]) => void;
  values: string[];
  setValues: (v: string[]) => void;
  communication: string[];
  setCommunication: (v: string[]) => void;
  lookingFor: string[];
  setLookingFor: (v: string[]) => void;
  experience: string[];
  setExperience: (v: string[]) => void;
  visibility: Visibility;
  setVisibility: (v: Visibility) => void;
}) {
  return (
    <View style={styles.stepBody}>
      <StepHeader
        kicker="Last step"
        title="Complete your profile"
        body="Add a few interests to become discoverable. Matching is values-based — photos stay blurred until you both connect."
      />
      <Field label="Interests">
        <ChipSelect options={config.vocab.interests} selected={interests} onChange={setInterests} />
      </Field>
      <Field label="What you value">
        <ChipSelect options={config.vocab.values} selected={values} onChange={setValues} />
      </Field>
      <Field label="Communication style">
        <ChipSelect options={config.vocab.communicationStyles} selected={communication} onChange={setCommunication} />
      </Field>
      <Field label="Looking for">
        <ChipSelect options={config.vocab.lookingFor} selected={lookingFor} onChange={setLookingFor} />
      </Field>
      <Field label="Experience level">
        <ChipSelect options={config.vocab.experienceLevels} selected={experience} onChange={setExperience} mode="single" />
      </Field>
      <Field label="Who can find you">
        <ChipSelect
          options={VISIBILITY.map((v) => v.label)}
          selected={[VISIBILITY.find((v) => v.value === visibility)?.label ?? ""]}
          onChange={(next) => {
            const found = VISIBILITY.find((v) => v.label === next[0]);
            if (found) setVisibility(found.value);
          }}
          mode="single"
        />
      </Field>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  progress: { flexDirection: "row", gap: 6, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.card2 },
  segmentOn: { backgroundColor: colors.accent },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  stepHead: { gap: 6, marginBottom: spacing.lg },
  kicker: {
    color: colors.accentSoft,
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: { color: colors.ink, fontSize: font.size.xxl, fontWeight: font.weight.semibold },
  body: { color: colors.inkSoft, fontSize: font.size.sm, lineHeight: 21 },
  stepBody: { gap: spacing.md },
  field: { gap: spacing.sm },
  fieldLabel: { color: colors.ink, fontSize: font.size.sm, fontWeight: font.weight.semibold },
  zipStatus: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  zipStatusText: { color: colors.inkFaint, fontSize: font.size.sm },
  zipResolved: { color: colors.accentSoft, fontSize: font.size.sm, fontWeight: font.weight.semibold },
  zipError: { color: colors.danger, fontSize: font.size.xs, marginTop: 2 },
  manualLink: { color: colors.inkFaint, fontSize: font.size.xs, marginTop: 4, textDecorationLine: "underline" },
  input: {
    color: colors.ink,
    fontSize: font.size.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  checkLabel: { flex: 1, color: colors.ink, fontSize: font.size.sm },
  pledgeCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pledgeRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  pledgeText: { flex: 1, color: colors.inkSoft, fontSize: font.size.sm, lineHeight: 21 },
  standardCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  standardHeading: { color: colors.ink, fontSize: font.size.md, fontWeight: font.weight.semibold },
  standardBody: { color: colors.inkSoft, fontSize: font.size.sm, lineHeight: 20 },
  fine: { color: colors.inkFaint, fontSize: font.size.xs, textAlign: "center", marginTop: spacing.xs },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorderSoft,
    backgroundColor: colors.bg2,
    gap: spacing.sm,
  },
  skip: { alignItems: "center", paddingVertical: 6 },
  skipText: { color: colors.inkFaint, fontSize: font.size.sm },
  error: { color: colors.danger, fontSize: font.size.sm, marginTop: spacing.sm, textAlign: "center" },
});
