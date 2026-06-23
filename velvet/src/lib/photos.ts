import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { put, del } from "@vercel/blob";
import { prisma } from "./db";
import { isStaff } from "./admin";
import { orderPair } from "./matching";
import { blockExistsBetween } from "./relations";

// Photos are stored OUTSIDE the public/ dir so they can never be fetched without
// going through the access-controlled /api/photo/[id] route (blueprint §19).
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

// Storage backend: Vercel Blob in production (serverless has no writable disk),
// local disk in dev/tests. The switch is the token Vercel injects when a Blob
// store is linked — absent it, we keep the original on-disk behavior so local
// development and the test suite work with no extra setup.
function useBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function ensureUploadDir() {
  if (useBlob()) return; // Blob needs no directory
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

  // Vercel Blob only supports public access, but the URL is unguessable and is
  // never sent to the browser — every read still proxies through the
  // access-controlled /api/photo/[id] route, so PRIVATE photos stay gated.
  let url: string | null = null;
  if (useBlob()) {
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
    });
    url = blob.url;
  } else {
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  }

  const screen = autoScreen(buffer, mime);
  return prisma.photo.create({
    data: {
      userId,
      filename,
      url,
      mime,
      status: "PENDING",
      autoFlagged: screen.flagged,
      autoFlagReason: screen.reason,
    },
  });
}

// Best-effort removal of stored photo files (used on account deletion, §19).
// Blob-backed photos are deleted from Blob by URL; legacy/disk photos by name.
export async function unlinkPhotoFiles(
  files: { filename: string; url: string | null }[],
): Promise<void> {
  await Promise.all(
    files.map(async (f) => {
      try {
        if (f.url) await del(f.url);
        else await unlink(path.join(UPLOAD_DIR, path.basename(f.filename)));
      } catch {
        /* best-effort */
      }
    }),
  );
}

export async function readPhotoFile(photo: { filename: string; url: string | null }): Promise<Buffer | null> {
  if (photo.url) {
    const res = await fetch(photo.url).catch(() => null);
    if (!res || !res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }
  const safe = path.basename(photo.filename); // guard against traversal
  const full = path.join(UPLOAD_DIR, safe);
  if (!existsSync(full)) return null;
  return readFile(full);
}

/**
 * Authorization for serving a photo (blueprint §9, §20):
 *  - the owner always sees their own photos
 *  - staff see any photo (for moderation)
 *  - for an APPROVED photo, another member sees it if it's PUBLIC, or — when it's
 *    PRIVATE — only if they have a confirmed mutual match
 *  - everyone else is denied (the UI shows a placeholder instead)
 */
export async function canViewPhoto(
  viewer: { id: string; role: string },
  photo: { userId: string; status: string; visibility: string },
): Promise<boolean> {
  if (photo.userId === viewer.id) return true;
  if (isStaff(viewer.role)) return true;
  if (photo.status !== "APPROVED") return false;

  // A block in either direction revokes photo visibility, even if a prior match
  // still exists (the match row is intentionally kept).
  if (await blockExistsBetween(viewer.id, photo.userId)) return false;

  // PUBLIC photos are visible to any signed-in member; PRIVATE ones require a match.
  if (photo.visibility === "PUBLIC") return true;

  const [a, b] = orderPair(viewer.id, photo.userId);
  const match = await prisma.match.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
  return !!match;
}
