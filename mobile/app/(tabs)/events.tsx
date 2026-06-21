import React from "react";
import { Screen } from "@/components/ui/Screen";
import { AppHeader } from "@/components/ui/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Events() {
  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Events" subtitle="Hosted, vetted, private" />
      <EmptyState
        icon="calendar-outline"
        title="No events nearby yet"
        body="Verified hosts run private, consent-first gatherings. When events open in your area, you'll find them here with clear etiquette and RSVP."
      />
    </Screen>
  );
}
