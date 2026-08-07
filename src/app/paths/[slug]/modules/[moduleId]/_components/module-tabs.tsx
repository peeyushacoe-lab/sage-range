"use client";

import { useState } from "react";

type Tab = "overview" | "reading" | "resources" | "quiz" | "assessment";

/**
 * Tab strip for a module page.
 *
 * Content arrives as ReactNode slots rather than a render prop. This is not a
 * style preference: the page rendering this is a Server Component, and a
 * function cannot cross the server/client boundary — React refuses to
 * serialise it and the whole route 500s. Nodes serialise fine.
 *
 * A tab is shown when its slot is present, so the strip cannot disagree with
 * what it can actually render.
 */
interface Props {
  overview: React.ReactNode;
  reading: React.ReactNode;
  resources: React.ReactNode;
  quiz?: React.ReactNode;
  assessment?: React.ReactNode;
}

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "reading", label: "Reading Material" },
  { id: "resources", label: "Resources" },
  { id: "quiz", label: "Quiz" },
  { id: "assessment", label: "Assessment" },
];

export function ModuleTabs({ overview, reading, resources, quiz, assessment }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const slots: Record<Tab, React.ReactNode> = {
    overview,
    reading,
    resources,
    quiz,
    assessment,
  };

  const visibleTabs = TAB_LABELS.filter((t) => {
    if (t.id === "quiz") return quiz != null;
    if (t.id === "assessment") return assessment != null;
    return true;
  });

  // Only the active panel is mounted, matching the previous behaviour — the
  // quiz and assessment panels hold their own state and should not be live
  // while the reader is on another tab.
  return (
    <div>
      <div className="flex gap-1 mb-8 border-b border-white/8 overflow-x-auto" role="tablist">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              activeTab === t.id
                ? "border-sage-500 text-sage-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{slots[activeTab]}</div>
    </div>
  );
}
