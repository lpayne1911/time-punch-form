// À-la-carte catalog (blueprint §25). Each item improves visibility, discovery,
// or convenience — none grant access to a specific person or any content. The
// catalog copy is deliberately non-transactional about people.

export type ItemKind = "BOOST" | "SUPER_LIKE" | "TRAVEL_PASS";

export type ShopItem = {
  kind: ItemKind;
  name: string;
  description: string;
  quantity: number; // credits granted per purchase
  priceCents: number;
};

export const SHOP_ITEMS: ShopItem[] = [
  {
    kind: "BOOST",
    name: "Profile Boost",
    description: "Be seen by more compatible members for 60 minutes. Visibility only — never a guarantee of a match.",
    quantity: 1,
    priceCents: 499,
  },
  {
    kind: "SUPER_LIKE",
    name: "Thoughtful Intros (5)",
    description: "Stand out to five people you're genuinely interested in. They still choose freely — connection only happens on mutual interest.",
    quantity: 5,
    priceCents: 599,
  },
  {
    kind: "TRAVEL_PASS",
    name: "Travel Pass",
    description: "Browse as if you're in another city for 24 hours — perfect before a trip.",
    quantity: 1,
    priceCents: 399,
  },
];

export const BOOST_DURATION_MIN = 60;
export const TRAVEL_PASS_DURATION_HRS = 24;
export const BOOST_SCORE_BONUS = 1000; // ensures boosted profiles surface near the top

export function itemForKind(kind: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.kind === kind);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
