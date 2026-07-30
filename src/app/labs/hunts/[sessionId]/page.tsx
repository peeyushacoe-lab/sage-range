import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { Icon, ICON_SIZE } from "@/components/ui/icon";
import { QueryConsole } from "../_components/query-console";
import { ArtifactForm } from "../_components/artifact-form";
import { HuntProgress } from "../_components/hunt-progress";

export const dynamic = "force-dynamic";

interface HuntSession {
  id: string;
  datasetId: string;
  userId: string;
  status: "ACTIVE" | "COMPLETED" | "ABANDONED";
  createdAt: string;
  dataset: {
    name: string;
    category: string;
    logCount: number;
    expectedArtifacts: string[];
  };
  artifacts: Array<{
    id: string;
    type: string;
    value: string;
    confidence: number;
    matched: boolean;
    score: number;
  }>;
  score: number;
  accuracy: number;
  elapsedSeconds: number;
}

async function getSession(sessionId: string): Promise<HuntSession | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/hunts/${sessionId}`,
      {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function HuntSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const session = await getSession(sessionId);
  if (!session) notFound();
  if (session.userId !== user.id) notFound();

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar />

      <div className="max-w-full h-[calc(100vh-64px)] overflow-hidden flex">
        {/* Left Panel: Dataset Info */}
        <div className="hidden lg:flex lg:w-80 border-r border-edge flex-col overflow-y-auto">
          <Card className="m-4 border-0">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Icon name="investigate" size={20} />
                <h3 className="font-semibold">{session.dataset.name}</h3>
              </div>
              <p className="text-xs text-ink-2">{session.dataset.category}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-2">Log entries:</span>
                  <span className="text-white font-semibold">{session.dataset.logCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-2">Expected artifacts:</span>
                  <span className="text-white font-semibold">{session.dataset.expectedArtifacts.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-2">Found:</span>
                  <span className="text-ok font-semibold">
                    {session.artifacts.filter((a) => a.matched).length}
                  </span>
                </div>
              </div>

              {/* Expected Artifacts List */}
              <div className="border-t border-edge pt-4">
                <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Expected artifacts</p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {session.dataset.expectedArtifacts.map((artifact, idx) => {
                    const found = session.artifacts.some((a) => a.value === artifact && a.matched);
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                          found
                            ? "bg-ok-wash text-ok"
                            : "bg-surface-2 text-ink-2"
                        }`}
                      >
                        <Icon
                          name={found ? "checkCircle" : "search"}
                          size={14}
                        />
                        <span className="truncate font-mono">{artifact}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Panel: Query Console */}
        <div className="flex-1 border-r border-edge flex flex-col overflow-hidden">
          <QueryConsole sessionId={sessionId} />
        </div>

        {/* Right Panel: Artifact Form & Progress */}
        <div className="hidden xl:flex xl:w-96 border-l border-edge flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <HuntProgress session={session} />
          </div>
          <div className="border-t border-edge p-4 flex-shrink-0">
            <ArtifactForm sessionId={sessionId} />
          </div>
        </div>
      </div>
    </main>
  );
}
