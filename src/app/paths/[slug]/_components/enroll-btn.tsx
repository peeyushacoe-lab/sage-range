"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EnrollBtn({ slug }: { slug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleEnroll() {
    setLoading(true);
    try {
      await fetch(`/api/paths/${slug}/enroll`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleEnroll}
      disabled={loading}
      className="rounded-lg bg-sage-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition disabled:opacity-50"
    >
      {loading ? "Enrolling…" : "Enroll in Path"}
    </button>
  );
}
