/**
 * Velvet design tokens — the single source of truth for the native client's
 * look. Ported from the web app's CSS custom properties so the two clients stay
 * visually in sync. Dark velvet/plum, mature and private: think elite private
 * club, never an adult website.
 */

export const colors = {
  bg: "#100b16",
  bg2: "#160f1e",
  bgSoft: "#1e1729",
  card: "#211a2f",
  card2: "#2a2139",
  cardBorder: "#392f4d",
  cardBorderSoft: "#2f2740",
  ink: "#f2eef7",
  inkSoft: "#b9aecb",
  inkFaint: "#8a7fa1",
  accent: "#c98bab",
  accentSoft: "#d8a6c0",
  accentDeep: "#7d4f66",
  accent2: "#b06a8e",
  gold: "#d4b681",
  danger: "#e09494",
  ok: "#93cdab",
  overlay: "rgba(16,11,22,0.72)",
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 32,
} as const;

export const font = {
  // Display serif for the brand + major headings; clean system sans for UI.
  // (Custom fonts can be wired via expo-font later; system fonts keep the
  // scaffold dependency-free and instant.)
  serif: undefined as string | undefined,
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 26,
    xxl: 34,
  },
  weight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
} as const;

export const gradients = {
  // Card scrim so name/age stay legible over photos.
  cardScrim: ["transparent", "rgba(16,11,22,0.05)", "rgba(16,11,22,0.92)"] as const,
  // Ambient app background glow, mirroring the web body::before.
  appGlow: ["#160f1e", "#100b16"] as const,
  accent: ["#b06a8e", "#7d4f66"] as const,
};

export type Colors = typeof colors;
