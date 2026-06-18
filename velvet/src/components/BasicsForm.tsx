"use client";

import { useState } from "react";

export default function BasicsForm({
  action,
  intentions,
  derivedAge,
  initial,
}: {
  action: (formData: FormData) => void;
  intentions: readonly string[];
  derivedAge: number | null;
  initial: { displayName: string; location: string; intentions: string[] };
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.intentions));

  function toggle(opt: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(opt) ? next.delete(opt) : next.add(opt);
      return next;
    });
  }

  return (
    <form action={action} className="sans">
      <label>Display name (a pseudonym is welcome)</label>
      <input name="displayName" defaultValue={initial.displayName} maxLength={40} required />

      <label>General location</label>
      <input name="location" defaultValue={initial.location} placeholder="e.g. Portland, OR" required />
      <p className="muted small" style={{ margin: "-8px 0 14px" }}>
        Approximate only — your city or region, never a precise location.
      </p>

      {derivedAge !== null && (
        <p className="muted small" style={{ margin: "0 0 14px" }}>
          You&apos;ll appear as <strong>{derivedAge}</strong>, from the birth year you gave at sign-up.
        </p>
      )}

      <label>What are you looking for?</label>
      <p className="muted small" style={{ margin: "2px 0 6px" }}>Your relationship intentions. Pick all that fit.</p>
      <div className="tagwrap">
        {intentions.map((opt) => {
          const on = selected.has(opt);
          return (
            <span key={opt} className={`tag ${on ? "on" : ""}`} onClick={() => toggle(opt)}>
              {opt}
            </span>
          );
        })}
      </div>
      {[...selected].map((v) => (
        <input key={v} type="hidden" name="intentions" value={v} />
      ))}

      <button className="btn block" style={{ marginTop: 16 }}>Start exploring</button>
    </form>
  );
}
