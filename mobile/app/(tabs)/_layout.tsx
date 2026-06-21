import React from "react";
import { StyleSheet } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/tokens";
import { useAuth } from "@/lib/auth";

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  discover: { active: "compass", inactive: "compass-outline" },
  likes: { active: "heart", inactive: "heart-outline" },
  matches: { active: "chatbubbles", inactive: "chatbubbles-outline" },
  events: { active: "calendar", inactive: "calendar-outline" },
  profile: { active: "person", inactive: "person-outline" },
};

export default function TabsLayout() {
  const { status, me } = useAuth();

  // Guard the whole app surface: a signed-out user can't reach the tabs, and an
  // unfinished member is sent back into the onboarding funnel.
  if (status === "signedOut") return <Redirect href="/(auth)/age-gate" />;
  if (me?.onboardingNext) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: {
          backgroundColor: colors.bg2,
          borderTopColor: colors.cardBorderSoft,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
        tabBarIcon: ({ focused, color, size }) => {
          const set = ICONS[route.name] ?? ICONS.discover;
          return <Ionicons name={focused ? set.active : set.inactive} size={size ?? 22} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="likes" options={{ title: "Likes" }} />
      <Tabs.Screen name="matches" options={{ title: "Matches" }} />
      <Tabs.Screen name="events" options={{ title: "Events" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
