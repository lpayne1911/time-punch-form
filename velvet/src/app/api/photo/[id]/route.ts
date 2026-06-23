import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewPhoto, readPhotoFile } from "@/lib/photos";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const allowed = await canViewPhoto({ id: user.id, role: user.role }, photo);
  if (!allowed) return NextResponse.json({ error: "Not available." }, { status: 403 });

  const data = await readPhotoFile(photo);
  if (!data) return NextResponse.json({ error: "Missing file." }, { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "private, no-store",
    },
  });
}

// Owner-only: switch a photo between PUBLIC (visible to any member / on the deck)
// and PRIVATE (gated behind a mutual match). Moderation status is untouched.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const visibility = body?.visibility;
  if (visibility !== "PUBLIC" && visibility !== "PRIVATE") {
    return NextResponse.json({ error: "Invalid visibility." }, { status: 400 });
  }

  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo || photo.userId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.photo.update({ where: { id }, data: { visibility } });
  return NextResponse.json({ ok: true, visibility });
}
