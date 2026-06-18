export const ONBOARDING_STEPS = ["Age", "Consent", "Standards", "Basics", "Profile"] as const;

/** Presentational onboarding stepper. `current` is 1-based. */
export default function OnboardingProgress({ current }: { current: number }) {
  return (
    <div className="ob-progress">
      <p className="small muted" style={{ margin: "0 0 6px" }}>
        Step {current} of {ONBOARDING_STEPS.length}: {ONBOARDING_STEPS[current - 1]}
      </p>
      <div className="ob-track">
        {ONBOARDING_STEPS.map((s, i) => (
          <div
            key={s}
            className={`ob-seg${i < current ? " done" : ""}${i === current - 1 ? " active" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
