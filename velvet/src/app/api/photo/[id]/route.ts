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

  const data = await readPhotoFile(photo.filename);
  if (!data) return NextResponse.json({ error: "Missing file." }, { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "private, no-store",
    },
  });
}
