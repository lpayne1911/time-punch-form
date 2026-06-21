import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { colors, font, radius, spacing } from "@/theme/tokens";
import { useAuth } from "@/lib/auth";

const VERIFICATION_LABEL: Record<string, string> = {
  UNVERIFIED: "Unverified",
  EMAIL_VERIFIED: "Email verified",
  PHOTO_VERIFIED: "Photo verified",
  ID_VERIFIED: "ID verified",
};

export default function Profile() {
  const router = useRouter();
  const { me, signOut } = useAuth();
  const profile = me?.profile;
  const monogram = (profile?.displayName ?? me?.email ?? "·").trim().charAt(0).toUpperCase();

  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Profile" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{monogram}</Text>
          </View>
          <Text style={styles.name}>{profile?.displayName ?? "Your profile"}</Text>
          <Text style={styles.meta}>
            {profile ? `${profile.ageLabel ?? profile.age} · ${profile.location}` : me?.email}
          </Text>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.gold} />
            <Text style={styles.badgeText}>
              {VERIFICATION_LABEL[me?.verification ?? "UNVERIFIED"]}
            </Text>
          </View>
        </View>

        {!profile?.completed ? (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
            <Text style={styles.noticeText}>
              Finish your profile in Velvet to become discoverable and unlock messaging.
            </Text>
          </View>
        ) : null}

        {profile?.intentions?.length ? (
          <Section title="Looking for">
            <View style={styles.tags}>
              {profile.intentions.map((t) => (
                <Tag key={t} label={t} tone="accent" />
              ))}
            </View>
          </Section>
        ) : null}

        {profile?.interests?.length ? (
          <Section title="Interests">
            <View style={styles.tags}>
              {profile.interests.map((t) => (
                <Tag key={t} label={t} />
              ))}
            </View>
          </Section>
        ) : null}

        {profile?.values?.length ? (
          <Section title="Values">
            <View style={styles.tags}>
              {profile.values.map((t) => (
                <Tag key={t} label={t} tone="gold" />
              ))}
            </View>
          </Section>
        ) : null}

        <View style={styles.menu}>
          <MenuRow
            icon="diamond-outline"
            label="Membership & add-ons"
            onPress={() => router.push("/premium")}
          />
          <MenuRow
            icon="settings-outline"
            label="Settings & safety"
            onPress={() => router.push("/settings")}
            last
          />
        </View>

        <View style={styles.signOut}>
          <Button label="Sign out" variant="ghost" onPress={signOut} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, !last && styles.menuRowBorder, pressed && styles.menuRowPressed]}
    >
      <Ionicons name={icon} size={20} color={colors.inkSoft} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40, gap: spacing.lg },
  header: { alignItems: "center", gap: 6, paddingVertical: spacing.lg },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(201,139,171,0.12)",
    borderWidth: 1,
    borderColor: "rgba(201,139,171,0.3)",
  },
  avatarText: { color: colors.accentSoft, fontSize: 40, fontWeight: font.weight.semibold },
  name: { color: colors.ink, fontSize: font.size.xl, fontWeight: font.weight.semibold, marginTop: 6 },
  meta: { color: colors.inkFaint, fontSize: font.size.sm },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(212,182,129,0.1)",
    borderWidth: 1,
    borderColor: "rgba(212,182,129,0.35)",
  },
  badgeText: { color: colors.gold, fontSize: font.size.xs, fontWeight: font.weight.medium },
  notice: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noticeText: { flex: 1, color: colors.inkSoft, fontSize: font.size.sm, lineHeight: 20 },
  section: { gap: spacing.sm },
  sectionTitle: {
    color: colors.inkFaint,
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  menu: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  menuRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  menuRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorderSoft },
  menuRowPressed: { backgroundColor: colors.card2 },
  menuLabel: { flex: 1, color: colors.ink, fontSize: font.size.md, fontWeight: font.weight.medium },
  signOut: { marginTop: spacing.md },
});
