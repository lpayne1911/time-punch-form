import Link from "next/link";
import { prisma } from "@/lib/db";
import { reviewMessage } from "../actions";

export const dynamic = "force-dynamic";

export default async function FlaggedMessages() {
  const messages = await prisma.message.findMany({
    where: { OR: [{ flagged: true }, { quarantined: true }] },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { sender: { include: { profile: true } } },
  });

  return (
    <>
      <h1>Flagged Messages</h1>
      <p className="lede">
        Messages auto-flagged for possible solicitation or threats (blueprint §11, §18).
        Quarantined ones are withheld from the recipient — release to deliver, or remove. Enforce
        against the sender from Users.
      </p>

      {messages.length === 0 ? (
        <div className="card center muted">No flagged messages.</div>
      ) : (
        messages.map((m) => (
          <div key={m.id} className="card sans">
            <div className="between">
              <p className="msg them flagged" style={{ maxWidth: "85%" }}>{m.body}</p>
              {m.quarantined && (
                <span className="badge" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                  Quarantined
                </span>
              )}
            </div>
            <p className="muted small" style={{ margin: "6px 0" }}>
              Sender:{" "}
              <Link href={`/admin/users?q=${encodeURIComponent(m.sender.email)}`}>
                {m.sender.profile?.displayName ?? m.sender.email}
              </Link>{" "}
              · {new Date(m.createdAt).toLocaleString()}
            </p>
            {m.quarantined && (
              <form action={reviewMessage} className="row">
                <input type="hidden" name="messageId" value={m.id} />
                <button name="decision" value="RELEASE" className="btn small">Release (deliver)</button>
                <button name="decision" value="REMOVE" className="btn danger small">Remove</button>
              </form>
            )}
          </div>
        ))
      )}
    </>
  );
}
