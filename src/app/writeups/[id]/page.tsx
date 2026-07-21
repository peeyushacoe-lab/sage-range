import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

// Minimal markdown-ish renderer: ## headings, paragraphs, inline `code`
function renderBody(body: string) {
  const blocks = body.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const line = block.trim();
    if (!line) return null;

    if (line.startsWith("### ")) {
      return <h4 key={i} className="text-base font-bold text-zinc-100 mt-5 mb-2">{line.slice(4)}</h4>;
    }
    if (line.startsWith("## ")) {
      return <h3 key={i} className="text-lg font-bold text-zinc-100 mt-6 mb-2 border-b border-white/8 pb-1">{line.slice(3)}</h3>;
    }
    if (line.startsWith("# ")) {
      return <h2 key={i} className="text-xl font-bold text-zinc-100 mt-6 mb-2">{line.slice(2)}</h2>;
    }

    // Bullet list block
    if (line.split("\n").every(l => l.trimStart().startsWith("- "))) {
      return (
        <ul key={i} className="list-disc list-inside space-y-1 text-sm text-zinc-300 my-2">
          {line.split("\n").map((l, j) => (
            <li key={j}>{renderInline(l.replace(/^[\s]*- /, ""))}</li>
          ))}
        </ul>
      );
    }

    // Code block
    if (line.startsWith("```")) {
      const code = line.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
      return (
        <pre key={i} className="bg-zinc-900 border border-white/8 rounded-lg px-4 py-3 text-sm text-emerald-300 font-mono overflow-x-auto my-3 whitespace-pre-wrap">
          {code}
        </pre>
      );
    }

    return (
      <p key={i} className="text-sm text-zinc-300 leading-relaxed my-2">
        {renderInline(line)}
      </p>
    );
  });
}

function renderInline(text: string): React.ReactNode {
  // Split on backtick code spans
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="bg-zinc-800 text-emerald-300 px-1 py-0.5 rounded text-[12px] font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default async function WriteupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const writeup = await db.writeup.findUnique({
    where:   { id },
    include: {
      user: { select: { id: true, displayName: true } },
      lab:  { select: { id: true, title: true, slug: true, difficulty: true, type: true } },
    },
  });

  if (!writeup || writeup.status !== "APPROVED") notFound();

  // Must have solved the lab to read writeups
  const attempt = await db.attempt.findUnique({
    where: { userId_labId: { userId: user.id, labId: writeup.lab.id } },
  });
  const hasSolved = attempt?.status === "SOLVED";

  if (!hasSolved && writeup.userId !== user.id) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-6 py-16 text-center space-y-4">
          <p className="text-5xl">🔒</p>
          <h1 className="text-xl font-bold">Solve the lab first</h1>
          <p className="text-sm text-zinc-500">You need to solve this challenge before reading writeups.</p>
          <Link href={`/labs/${writeup.lab.slug}`}
            className="inline-block mt-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition">
            Go to Lab
          </Link>
        </main>
      </div>
    );
  }

  const DIFF_COLOR: Record<string, string> = {
    EASY: "text-emerald-400", MEDIUM: "text-amber-400",
    HARD: "text-orange-400",  INSANE: "text-red-400",
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href={`/labs/${writeup.lab.slug}`} className="hover:text-zinc-300 transition">{writeup.lab.title}</Link>
          <span>/</span>
          <Link href={`/labs/${writeup.lab.slug}/writeups`} className="hover:text-zinc-300 transition">Writeups</Link>
        </div>

        {/* Header */}
        <header className="border-b border-white/8 pb-5">
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
            <span className={DIFF_COLOR[writeup.lab.difficulty]}>{writeup.lab.difficulty}</span>
            <span>·</span>
            <span>{writeup.lab.type.replace("_", " ")}</span>
          </div>
          <h1 className="text-2xl font-bold leading-snug">{writeup.title}</h1>
          <p className="text-sm text-zinc-500 mt-2">
            by{" "}
            <Link href={`/profile/${writeup.user.id}`} className="text-zinc-300 hover:text-white transition">
              {writeup.user.displayName ?? "Anonymous"}
            </Link>
            {" · "}
            {writeup.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </header>

        {/* Body */}
        <article className="space-y-1">
          {renderBody(writeup.body)}
        </article>

        {/* Footer */}
        <div className="border-t border-white/8 pt-5 flex items-center justify-between">
          <Link href={`/labs/${writeup.lab.slug}/writeups`}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition">
            ← All writeups for this lab
          </Link>
          {writeup.userId === user.id && (
            <Link href={`/labs/${writeup.lab.slug}/writeups/submit`}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition">
              Edit my writeup →
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
