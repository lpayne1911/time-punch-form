import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { savePhoto, ALLOWED_MIME, MAX_BYTES } from "@/lib/photos";

const MAX_PHOTOS = 6;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const count = await prisma.photo.count({ where: { userId: user.id } });
  if (count >= MAX_PHOTOS) {
    return NextResponse.json({ error: `You can have up to ${MAX_PHOTOS} photos.` }, { status: 400 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No photo provided." }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 6 MB)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const photo = await savePhoto(user.id, buffer, file.type);

  return NextResponse.json({
    ok: true,
    photo: { id: photo.id, status: photo.status },
    notice: "Thanks — your photo is awaiting review and isn't visible to others yet.",
  });
}
