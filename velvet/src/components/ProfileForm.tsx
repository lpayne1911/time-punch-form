"use client";

import { useState } from "react";

type TagGroup = { name: string; label: string; options: readonly string[]; hint?: string };

function TagPicker({
  group,
  initial,
}: {
  group: TagGroup;
  initial: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));

  function toggle(opt: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(opt) ? next.delete(opt) : next.add(opt);
      return next;
    });
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <label>{group.label}</label>
      {group.hint && <p className="muted small" style={{ margin: "2px 0 6px" }}>{group.hint}</p>}
      <div className="tagwrap">
        {group.options.map((opt) => {
          const on = selected.has(opt);
          return (
            <span key={opt} className={`tag ${on ? "on" : ""}`} onClick={() => toggle(opt)}>
              {opt}
            </span>
          );
        })}
      </div>
      {/* Hidden inputs carry the selection to the server action */}
      {[...selected].map((v) => (
        <input key={v} type="hidden" name={group.name} value={v} />
      ))}
    </div>
  );
}

export default function ProfileForm({
  action,
  groups,
  experienceLevels,
  visibilityOptions,
  initial,
}: {
  action: (formData: FormData) => void;
  groups: TagGroup[];
  experienceLevels: readonly string[];
  visibilityOptions: readonly { value: string; label: string }[];
  initial: {
    displayName: string;
    age: string;
    location: string;
    experienceLevel: string;
    visibility: string;
    promptCommunication: string;
    promptBoundary: string;
    tags: Record<string, string[]>;
  };
}) {
  return (
    <form action={action} className="sans">
      <label>Display name (a pseudonym is welcome)</label>
      <input name="displayName" defaultValue={initial.displayName} maxLength={40} required />

      <div className="row" style={{ gap: 14 }}>
        <div style={{ flex: 1 }}>
          <label>Age</label>
          <input name="age" inputMode="numeric" defaultValue={initial.age} required />
        </div>
        <div style={{ flex: 2 }}>
          <label>General location (city / region)</label>
          <input name="location" defaultValue={initial.location} placeholder="e.g. Portland, OR" required />
        </div>
      </div>

      <label>Experience level</label>
      <select name="experienceLevel" defaultValue={initial.experienceLevel}>
        <option value="">Prefer not to say</option>
        {experienceLevels.map((e) => (
          <option key={e} value={e}>{e}</option>
        ))}
      </select>

      {groups.map((g) => (
        <TagPicker key={g.name} group={g} initial={initial.tags[g.name] ?? []} />
      ))}

      <label>What does respectful communication look like to you?</label>
      <textarea
        name="promptCommunication"
        rows={2}
        maxLength={280}
        defaultValue={initial.promptCommunication}
        placeholder="Keep it thoughtful and non-explicit."
      />

      <label>A boundary I always honor is…</label>
      <textarea
        name="promptBoundary"
        rows={2}
        maxLength={280}
        defaultValue={initial.promptBoundary}
      />

      <label>Who can see your profile?</label>
      <select name="visibility" defaultValue={initial.visibility}>
        {visibilityOptions.map((v) => (
          <option key={v.value} value={v.value}>{v.label}</option>
        ))}
      </select>
      <p className="muted small">
        Private by default. Photos stay blurred until you and another member both express interest.
      </p>

      <button className="btn block" style={{ marginTop: 16 }}>Save profile</button>
    </form>
  );
}
