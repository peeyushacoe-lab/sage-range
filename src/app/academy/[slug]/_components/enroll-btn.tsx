"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EnrollBtn({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function enroll() {
    setLoading(true);
    const res = await fetch("/api/academy/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    });
    if (res.ok) router.refresh();
    else setLoading(false);
  }

  return (
    <button
      onClick={() => void enroll()}
      disabled={loading}
      className="bg-ok hover:bg-ok-wash disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
    >
      {loading ? "Enrolling…" : "Enroll in Course"}
    </button>
  );
}
