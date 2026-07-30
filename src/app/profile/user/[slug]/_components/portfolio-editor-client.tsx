"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ProfileEditor } from "./profile-editor";

export function PortfolioEditorClient({
  portfolio,
}: {
  portfolio: {
    id: string;
    userId: string;
    bio: string | null;
    visibility: string;
  };
}) {
  const [showEditor, setShowEditor] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowEditor(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-zinc-800/50 transition text-sm text-zinc-300 font-medium shrink-0"
      >
        <Icon name="settings" size={16} variant="current" />
        Edit Profile
      </button>

      {showEditor && (
        <ProfileEditor
          portfolioId={portfolio.id}
          userId={portfolio.userId}
          initialBio={portfolio.bio}
          initialVisibility={portfolio.visibility as any}
          onClose={() => setShowEditor(false)}
        />
      )}
    </>
  );
}
