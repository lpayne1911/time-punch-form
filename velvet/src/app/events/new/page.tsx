import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/guard";
import Nav from "@/components/Nav";
import { EVENT_CATEGORIES, EVENT_FORMATS, EVENT_RULES } from "@/lib/events";
import { createEvent } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewEvent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireOnboarded();
  if (!user.isHost) redirect("/events/host");
  const { error } = await searchParams;

  return (
    <>
      <Nav />
      <div className="shell" style={{ maxWidth: 600 }}>
        <h1>Create an event</h1>
        <p className="lede">
          Your event is reviewed before it's listed. Keep it consent-centered, lawful, and
          non-explicit.
        </p>
        {error && <div className="notice danger small sans">Please complete all required fields with a valid date.</div>}

        <div className="card sans">
          <form action={createEvent}>
            <label>Title</label>
            <input name="title" maxLength={120} required />

            <label>Description</label>
            <textarea name="description" rows={5} maxLength={4000} required placeholder="What to expect, who it's for, and the code of conduct." />

            <label>Category</label>
            <select name="category" required defaultValue="">
              <option value="" disabled>Choose a category</option>
              {EVENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>

            <label>Format</label>
            <select name="format" defaultValue="IN_PERSON">
              {EVENT_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>

            <label>Location (general venue or city — not a precise address)</label>
            <input name="location" maxLength={120} required placeholder="e.g. Downtown Portland, or Online" />

            <div className="row" style={{ gap: 14 }}>
              <div style={{ flex: 1 }}>
                <label>Date & time</label>
                <input name="startsAt" type="datetime-local" required />
              </div>
              <div style={{ width: 110 }}>
                <label>Capacity</label>
                <input name="capacity" type="number" defaultValue={20} min={1} />
              </div>
              <div style={{ width: 120 }}>
                <label>Ticket price ($)</label>
                <input name="price" type="number" defaultValue={0} min={0} step="0.01" />
              </div>
            </div>
            <p className="muted small">Set price to 0 for a free event. Paid tickets settle via our external payments partner.</p>

            <div className="notice warn small">
              {EVENT_RULES[1]} {EVENT_RULES[2]}
            </div>

            <button className="btn block" style={{ marginTop: 12 }}>Submit for review</button>
          </form>
        </div>
      </div>
    </>
  );
}
