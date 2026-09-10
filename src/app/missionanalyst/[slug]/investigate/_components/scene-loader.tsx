"use client";

import dynamic from "next/dynamic";

// ssr: false is only permitted from within a Client Component in the App
// Router — hence this one-purpose wrapper rather than calling dynamic()
// directly from the server page. The reason it's needed at all: the Three.js/
// react-reconciler renderer assumes a browser DOM/WebGL context that doesn't
// exist during Next's server render pass, and letting it attempt to SSR
// anyway produces a hard-to-read "ReactCurrentBatchConfig" crash instead of a
// clean error.
const InvestigationScene = dynamic(
  () => import("./investigation-scene").then((m) => m.InvestigationScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
        Loading scene…
      </div>
    ),
  },
);

export function SceneLoader(props: {
  sessionId: string;
  title: string;
  objective: string;
  environment: string;
}) {
  return <InvestigationScene {...props} />;
}
