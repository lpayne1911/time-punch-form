"use client";

import { useMemo, useState } from "react";

type TagGroup = { name: string; label: string; options: readonly string[]; hint?: string };
type Option = { value: string; label: string };

// Which wizard step each multi-select tag group belongs to.
const GROUP_STEP: Record<string, number> = {
  intentions: 2,
  lookingFor: 2,
  interests: 3,
  communicationStyle: 3,
  boundaries: 3,
  dealbreakers: 3,
  values: 3,
};

const STEP_TITLES = ["About you", "Your intentions", "You & connection", "Prompts & privacy"];

function TagPicker({
  group,
  selected,
  onToggle,
}: {
  group: TagGroup;
  selected: Set<string>;
  onToggle: (name: string, opt: string) => void;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label>{group.label}</label>
      {group.hint && <p className="muted small" style={{ margin: "2px 0 6px" }}>{group.hint}</p>}
      <div className="tagwrap">
        {group.options.map((opt) => {
          const on = selected.has(opt);
          return (
            <span key={opt} className={`tag ${on ? "on" : ""}`} onClick={() => onToggle(group.name, opt)}>
              {opt}
            </span>
          );
        })}
      </div>
      {[...selected].map((v) => (
        <input key={v} type="hidden" name={group.name} value={v} />
      ))}
    </div>
  );
}

function SelectField({
  label, name, value, onChange, options, placeholder,
}: {
  label: string; name: string; value: string;
  onChange: (v: string) => void; options: readonly string[] | readonly Option[]; placeholder: string;
}) {
  const opts: Option[] = (options as readonly (string | Option)[]).map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <>
      <label>{label}</label>
      <select name={name} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </>
  );
}

const VISIBILITY_EXAMPLES: Record<string, string> = {
  MATCHES_ONLY: "Most private: you won't appear in Discover. People reach you only through existing matches.",
  VERIFIED_ONLY: "Recommended: only verified members can find you in Discover.",
  PUBLIC_MEMBERS: "Any signed-in member can find you in Discover. Photos still stay blurred until mutual interest.",
};

export default function ProfileForm({
  action,
  groups,
  experienceLevels,
  visibilityOptions,
  intentionIntensity,
  availability,
  meetReadiness,
  ageDisplayOptions,
  initial,
}: {
  action: (formData: FormData) => void;
  groups: TagGroup[];
  experienceLevels: readonly string[];
  visibilityOptions: readonly Option[];
  intentionIntensity: readonly string[];
  availability: readonly string[];
  meetReadiness: readonly string[];
  ageDisplayOptions: readonly Option[];
  initial: {
    displayName: string;
    age: string;
    location: string;
    experienceLevel: string;
    visibility: string;
    ageDisplay: string;
    intentionIntensity: string;
    availability: string;
    meetReadiness: string;
    prompts: Record<string, string>;
    tags: Record<string, string[]>;
  };
}) {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [age] = useState(initial.age);
  const [location, setLocation] = useState(initial.location);
  const [experienceLevel, setExperienceLevel] = useState(initial.experienceLevel);
  const [ageDisplay, setAgeDisplay] = useState(initial.ageDisplay || "EXACT");
  const [visibility, setVisibility] = useState(initial.visibility);
  const [intensity, setIntensity] = useState(initial.intentionIntensity);
  const [avail, setAvail] = useState(initial.availability);
  const [meet, setMeet] = useState(initial.meetReadiness);
  const [prompts, setPrompts] = useState<Record<string, string>>(initial.prompts);
  const [tags, setTags] = useState<Record<string, Set<string>>>(() => {
    const m: Record<string, Set<string>> = {};
    for (const g of groups) m[g.name] = new Set(initial.tags[g.name] ?? []);
    return m;
  });

  function toggleTag(name: string, opt: string) {
    setTags((prev) => {
      const next = { ...prev, [name]: new Set(prev[name]) };
      next[name].has(opt) ? next[name].delete(opt) : next[name].add(opt);
      return next;
    });
  }
  const setPrompt = (k: string, v: string) => setPrompts((p) => ({ ...p, [k]: v }));

  // Live strength meter (#30).
  const strength = useMemo(() => {
    const tagHas = (n: string) => (tags[n]?.size ?? 0) > 0;
    const has = (v: string) => Boolean(v && v.trim());
    const promptCount = Object.values(prompts).filter((v) => v && v.trim()).length;
    const checks = [
      has(displayName), has(location), tagHas("intentions"), tagHas("interests"),
      tagHas("communicationStyle"), tagHas("boundaries"), tagHas("values"), tagHas("lookingFor"),
      has(experienceLevel), has(intensity), has(avail), has(meet),
      promptCount >= 1, promptCount >= 2,
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [displayName, location, tags, experienceLevel, intensity, avail, meet, prompts]);

  const groupsFor = (n: number) => groups.filter((g) => GROUP_STEP[g.name] === n);
  const sectionStyle = (n: number): React.CSSProperties =>
    step === n ? {} : { display: "none" };

  return (
    <form action={action} className="sans">
      {/* Strength meter + step header */}
      <div className="between" style={{ marginBottom: 4 }}>
        <strong>{STEP_TITLES[step - 1]}</strong>
        <span className="muted small">Step {step} of 4</span>
      </div>
      <div className="meter-track" aria-hidden style={{ marginBottom: 4 }}>
        <div className="meter-fill" style={{ width: `${strength}%` }} />
      </div>
      <p className="muted small" style={{ marginBottom: 16 }}>
        Profile strength: {strength}%{strength < 100 ? " — more detail means better matches." : " — looking great."}
      </p>

      {/* Step 1 — About you */}
      <div style={sectionStyle(1)}>
        <label>Display name (a pseudonym is welcome)</label>
        <input name="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} required />

        <div className="row" style={{ gap: 14 }}>
          <div style={{ flex: 1 }}>
            <label>Age</label>
            <input name="age" inputMode="numeric" defaultValue={age} readOnly />
            <p className="muted small" style={{ marginTop: -8 }}>From your birth year.</p>
          </div>
          <div style={{ flex: 2 }}>
            <label>General location (city / region)</label>
            <input name="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Portland, OR" required />
          </div>
        </div>

        <SelectField label="How your age is shown" name="ageDisplay" value={ageDisplay} onChange={setAgeDisplay}
          options={ageDisplayOptions} placeholder="Show my exact age" />

        <SelectField label="Experience level" name="experienceLevel" value={experienceLevel} onChange={setExperienceLevel}
          options={experienceLevels} placeholder="Prefer not to say" />
      </div>

      {/* Step 2 — Intentions */}
      <div style={sectionStyle(2)}>
        {groupsFor(2).map((g) => (
          <TagPicker key={g.name} group={g} selected={tags[g.name]} onToggle={toggleTag} />
        ))}
        <SelectField label="How intentional are you right now?" name="intentionIntensity" value={intensity} onChange={setIntensity}
          options={intentionIntensity} placeholder="Prefer not to say" />
        <SelectField label="Communication availability" name="availability" value={avail} onChange={setAvail}
          options={availability} placeholder="Prefer not to say" />
        <SelectField label="Meet readiness" name="meetReadiness" value={meet} onChange={setMeet}
          options={meetReadiness} placeholder="Prefer not to say" />
      </div>

      {/* Step 3 — You & connection */}
      <div style={sectionStyle(3)}>
        {groupsFor(3).map((g) => (
          <TagPicker key={g.name} group={g} selected={tags[g.name]} onToggle={toggleTag} />
        ))}
      </div>

      {/* Step 4 — Prompts & privacy */}
      <div style={sectionStyle(4)}>
        <p className="muted small" style={{ marginTop: 0 }}>Answer a few prompts — these help you stand out. Keep them respectful and non-explicit.</p>

        <label>My ideal first conversation starts with…</label>
        <textarea name="promptFirstConversation" rows={2} maxLength={280}
          value={prompts.promptFirstConversation} onChange={(e) => setPrompt("promptFirstConversation", e.target.value)} />

        <label>The connection I&apos;m hoping for feels like…</label>
        <textarea name="promptIdealConnection" rows={2} maxLength={280}
          value={prompts.promptIdealConnection} onChange={(e) => setPrompt("promptIdealConnection", e.target.value)} />

        <label>What does respectful communication look like to you?</label>
        <textarea name="promptCommunication" rows={2} maxLength={280}
          value={prompts.promptCommunication} onChange={(e) => setPrompt("promptCommunication", e.target.value)}
          placeholder="Keep it thoughtful and non-explicit." />

        <label>A boundary I respect deeply is…</label>
        <textarea name="promptBoundary" rows={2} maxLength={280}
          value={prompts.promptBoundary} onChange={(e) => setPrompt("promptBoundary", e.target.value)} />

        <label>Who can see your profile?</label>
        <select name="visibility" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          {visibilityOptions.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
        <p className="muted small">{VISIBILITY_EXAMPLES[visibility] ?? VISIBILITY_EXAMPLES.VERIFIED_ONLY}</p>
      </div>

      {/* Wizard nav */}
      <div className="card-actions" style={{ marginTop: 18 }}>
        {step > 1 && (
          <button type="button" className="btn ghost" onClick={() => setStep((s) => s - 1)}>Back</button>
        )}
        {step < 4 ? (
          <button type="button" className="btn block" onClick={() => setStep((s) => s + 1)}>Continue</button>
        ) : (
          <button className="btn block">Save profile</button>
        )}
      </div>
    </form>
  );
}
