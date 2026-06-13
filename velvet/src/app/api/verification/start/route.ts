import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { startCheck } from "@/lib/verification";

const schema = z.object({ type: z.enum(["PHOTO_LIVENESS", "ID_DOCUMENT"]) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const { checkId, redirectUrl } = await startCheck(user.id, parsed.data.type);
  return NextResponse.json({ ok: true, checkId, redirectUrl });
}
