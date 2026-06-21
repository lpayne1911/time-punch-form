import React from "react";
import { Screen } from "@/components/ui/Screen";
import { AppHeader } from "@/components/ui/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Matches() {
  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Matches" subtitle="Conversations start with consent" />
      <EmptyState
        icon="chatbubbles-outline"
        title="No matches yet"
        body="Mutual connections show up here with a gentle 48-hour window to say hello. Keep discovering — thoughtful matches are worth the wait."
      />
    </Screen>
  );
}
