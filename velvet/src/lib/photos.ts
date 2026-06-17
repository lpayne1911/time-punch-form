import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { prisma } from "./db";
import { isStaff } from "./admin";
import { orderPair } from "./matching";
import { blockExistsBetween } from "./relations";

// Photos are stored OUTSIDE the public/ dir so they can never be fetched without
// going through the access-controlled /api/photo/[id] route (blueprint §19).
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

export async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true });
}

/**
 * Automated pre-screen stub (blueprint §35). A real deployment pipes the buffer
 * to a nudity/explicit classifier (Hive / AWS Rekognition) and uses the score
 * here. In this MVP we conservatively flag everything for human review and never
 * auto-approve — the governance path (PENDING -> human decision) is what matters.
 */
export function autoScreen(_buffer: Buffer, mime: string): { flagged: boolean; reason: string | null } {
  if (!ALLOWED_MIME.includes(mime)) return { flagged: true, reason: "unsupported_format" };
  // Placeholder: mark for human review. Swap for a classifier score in production.
  return { flagged: true, reason: "awaiting_automated_classifier" };
}

export async function savePhoto(userId: string, buffer: Buffer, mime: string) {
  await ensureUploadDir();
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const filename = `${userId}_${randomBytes(8).toString("hex")}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  const screen = autoScreen(buffer, mime);
  return prisma.photo.create({
    data: {
      userId,
      filename,
      mime,
      status: "PENDING",
      autoFlagged: screen.flagged,
      autoFlagReason: screen.reason,
    },
  });
}

// Best-effort removal of photo files from disk (used on account deletion, §19).
export async function unlinkPhotoFiles(filenames: string[]): Promise<void> {
  await Promise.all(
    filenames.map((f) => unlink(path.join(UPLOAD_DIR, path.basename(f))).catch(() => {})),
  );
}

export async function readPhotoFile(filename: string): Promise<Buffer | null> {
  const safe = path.basename(filename); // guard against traversal
  const full = path.join(UPLOAD_DIR, safe);
  if (!existsSync(full)) return null;
  return readFile(full);
}

/**
 * Authorization for serving a photo (blueprint §9, §20 — blur/hide until match):
 *  - the owner always sees their own photos
 *  - staff see any photo (for moderation)
 *  - another member sees it ONLY if it's APPROVED and they have a mutual match
 *  - everyone else is denied (the UI shows a blurred placeholder instead)
 */
export async function canViewPhoto(
  viewer: { id: string; role: string },
  photo: { userId: string; status: string },
): Promise<boolean> {
  if (photo.userId === viewer.id) return true;
  if (isStaff(viewer.role)) return true;
  if (photo.status !== "APPROVED") return false;

  // A block in either direction revokes photo visibility, even if a prior match
  // still exists (the match row is intentionally kept).
  if (await blockExistsBetween(viewer.id, photo.userId)) return false;

  const [a, b] = orderPair(viewer.id, photo.userId);
  const match = await prisma.match.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
  return !!match;
}
