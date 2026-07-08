import { Suspense } from "react";
import { NexusSsoClient } from "./nexus-sso-client";

export const dynamic = "force-dynamic";

export default function NexusSsoPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Suspense fallback={null}>
        <NexusSsoClient />
      </Suspense>
    </main>
  );
}
