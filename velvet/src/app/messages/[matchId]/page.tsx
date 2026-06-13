import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/guard";
import { prisma } from "@/lib/db";
import Nav from "@/components/Nav";
import Thread from "@/components/Thread";

export const dynamic = "force-dynamic";

export default async function MessageThread({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const user = await requireOnboarded();
  const { matchId } = await params;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.userAId !== user.id && match.userBId !== user.id)) {
    redirect("/matches");
  }

  const otherId = match.userAId === user.id ? match.userBId : match.userAId;
  const other = await prisma.user.findUnique({
    where: { id: otherId },
    include: { profile: true },
  });

  const messages = await prisma.message.findMany({
    where: { matchId },
    orderBy: { createdAt: "asc" },
  });

  // Now that there's a mutual match, the other member's approved photo is
  // viewable (blueprint §9 — blurred until mutual interest).
  const otherPhoto = await prisma.photo.findFirst({
    where: { userId: otherId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const blocked = await prisma.block.findFirst({
    where: { blockerId: user.id, blockedId: otherId },
  });

  return (
    <>
      <Nav />
      <div className="shell" style={{ maxWidth: 620 }}>
        <Thread
          matchId={matchId}
          meId={user.id}
          otherId={otherId}
          otherName={other?.profile?.displayName ?? "Member"}
          otherPhotoId={otherPhoto?.id ?? null}
          initialMessages={messages.map((m) => ({
            id: m.id,
            body: m.body,
            senderId: m.senderId,
            flagged: m.flagged,
          }))}
          alreadyBlocked={!!blocked}
        />
      </div>
    </>
  );
}
