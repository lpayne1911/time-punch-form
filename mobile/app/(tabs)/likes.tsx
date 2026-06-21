import React from "react";
import { Screen } from "@/components/ui/Screen";
import { AppHeader } from "@/components/ui/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Likes() {
  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Likes" subtitle="Members who chose you first" />
      <EmptyState
        icon="heart-outline"
        title="No likes yet"
        body="When someone likes you, they'll appear here. Like them back to open a private connection — interest is always mutual before anyone can message."
      />
    </Screen>
  );
}
