import { redirect } from "next/navigation";
import Link from "next/link";
import { requireOnboarded } from "@/lib/guard";
import { prisma } from "@/lib/db";
import Nav from "@/components/Nav";
import { EVENT_RULES } from "@/lib/events";
import { applyToHost } from "../actions";

export const dynamic = "force-dynamic";

export default async function HostApply({
  searchParams,
}: {
  searchParams: Promise<{ applied?: string; error?: string }>;
}) {
  const user = await requireOnboarded();
  const { applied, error } = await searchParams;

  if (user.isHost) {
    return (
      <>
        <Nav />
        <div className="shell">
          <h1>You're a verified host</h1>
          <p className="lede">Create and manage gatherings for the community.</p>
          <Link href="/events/new" className="btn">Create an event</Link>
        </div>
      </>
    );
  }

  const existing = await prisma.hostApplication.findUnique({ where: { userId: user.id } });

  return (
    <>
      <Nav />
      <div className="shell" style={{ maxWidth: 600 }}>
        <h1>Become a verified host</h1>
        <p className="lede">
          Hosts run social mixers, workshops, and community meetups. Applications are reviewed, and
          every event you create is approved before it's listed.
        </p>

        {applied && <div className="notice ok small sans">Thanks — your application is under review.</div>}
        {error && <div className="notice danger small sans">Please tell us a little about yourself.</div>}

        {existing && existing.status === "PENDING" && !applied && (
          <div className="notice warn small sans">Your application is under review.</div>
        )}
        {existing && existing.status === "REJECTED" && (
          <div className="notice danger small sans">
            Your previous application wasn't approved{existing.note ? `: ${existing.note}` : "."} You may reapply below.
          </div>
        )}

        <div className="card sans">
          <h2 style={{ marginTop: 0 }}>What hosts agree to</h2>
          <ul className="small stack" style={{ paddingLeft: 18 }}>
            {EVENT_RULES.map((r) => <li key={r}>{r}</li>)}
            <li>No adult-content sales, private sexual-service listings, or off-platform solicitation.</li>
            <li>Clear payout, refund, and cancellation handling; you're responsible for your own taxes.</li>
          </ul>

          <form action={applyToHost}>
            <label>Tell us about yourself</label>
            <textarea name="bio" rows={4} required defaultValue={existing?.bio ?? ""} placeholder="Who you are and the kind of events you'd host." />
            <label>Relevant experience (optional)</label>
            <textarea name="experience" rows={3} defaultValue={existing?.experience ?? ""} />
            <button className="btn block" style={{ marginTop: 8 }}>Apply to host</button>
          </form>
        </div>
      </div>
    </>
  );
}
