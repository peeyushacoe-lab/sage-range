"use client";

import { useState } from "react";

type Tab = "overview" | "reading" | "resources" | "quiz" | "assessment";

interface Props {
  hasQuiz: boolean;
  hasAssessment: boolean;
  children: (tab: Tab) => React.ReactNode;
}

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "reading", label: "Reading Material" },
  { id: "resources", label: "Resources" },
  { id: "quiz", label: "Quiz" },
  { id: "assessment", label: "Assessment" },
];

export function ModuleTabs({ hasQuiz, hasAssessment, children }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const visibleTabs = TAB_LABELS.filter((t) => {
    if (t.id === "quiz") return hasQuiz;
    if (t.id === "assessment") return hasAssessment;
    return true;
  });

  return (
    <div>
      <div className="flex gap-1 mb-8 border-b border-white/8 overflow-x-auto">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
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
      {children(activeTab)}
    </div>
  );
}
