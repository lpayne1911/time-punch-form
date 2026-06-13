import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function FlaggedMessages() {
  const messages = await prisma.message.findMany({
    where: { flagged: true },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { sender: { include: { profile: true } } },
  });

  return (
    <>
      <h1>Flagged Messages</h1>
      <p className="lede">
        Messages auto-flagged for possible solicitation or threats (blueprint §11, §18). Review
        context, then enforce against the sender from Users.
      </p>

      {messages.length === 0 ? (
        <div className="card center muted">No flagged messages.</div>
      ) : (
        messages.map((m) => (
          <div key={m.id} className="card sans">
            <p className="msg them flagged" style={{ maxWidth: "100%" }}>{m.body}</p>
            <p className="muted small" style={{ margin: "6px 0 0" }}>
              Sender:{" "}
              <Link href={`/admin/users?q=${encodeURIComponent(m.sender.email)}`}>
                {m.sender.profile?.displayName ?? m.sender.email}
              </Link>{" "}
              · {new Date(m.createdAt).toLocaleString()}
            </p>
          </div>
        ))
      )}
    </>
  );
}
