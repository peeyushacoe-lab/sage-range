"use client";

import { useState } from "react";

export function CheckoutBtn({ className }: { className: string }) {
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "classroom" }),
    });
    const data = await res.json() as { url?: string; error?: string };
    if (data.url) {
      window.location.href = data.url;
    } else if (data.error === "unauthorized") {
      window.location.href = "/sign-up?plan=classroom";
    } else {
      setLoading(false);
    }
  }

  return (
    <button disabled className={className} style={{ opacity: 0.5, cursor: "not-allowed" }}>
      Coming Soon
    </button>
  );
}
