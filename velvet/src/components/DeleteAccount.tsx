"use client";

import { useState } from "react";

export default function DeleteAccount({ action }: { action: () => void }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button className="btn danger" onClick={() => setConfirming(true)}>
        Delete my account
      </button>
    );
  }

  return (
    <div className="notice danger sans">
      <p>
        This permanently deletes your profile, matches, and messages. This cannot be undone.
      </p>
      <form action={action} className="row">
        <button className="btn danger">Yes, delete everything</button>
        <button type="button" className="btn ghost" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </form>
    </div>
  );
}
