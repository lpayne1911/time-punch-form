// Pure, server-free verification helpers — safe to import from client components.
// (The server-side flow with Prisma/provider lives in verification.ts.)

export type VerificationType = "PHOTO_LIVENESS" | "ID_DOCUMENT";
export type Level = "UNVERIFIED" | "EMAIL_VERIFIED" | "PHOTO_VERIFIED" | "ID_VERIFIED";

const LEVEL_ORDER: Level[] = ["UNVERIFIED", "EMAIL_VERIFIED", "PHOTO_VERIFIED", "ID_VERIFIED"];

export function levelRank(l: string): number {
  const i = LEVEL_ORDER.indexOf(l as Level);
  return i < 0 ? 0 : i;
}

export const LEVEL_LABELS: Record<string, string> = {
  UNVERIFIED: "Not verified",
  EMAIL_VERIFIED: "Email verified",
  PHOTO_VERIFIED: "Photo verified",
  ID_VERIFIED: "ID verified",
};

export function levelForType(type: VerificationType): Level {
  return type === "ID_DOCUMENT" ? "ID_VERIFIED" : "PHOTO_VERIFIED";
}
