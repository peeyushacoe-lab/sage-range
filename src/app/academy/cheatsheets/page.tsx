import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CheatSheetsPage() {
  const sheets = await db.academyCheatSheet.findMany({
    where: { published: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <a href="/academy" className="text-xs text-ink-3 hover:text-ink-2 transition mb-6 block">← Academy</a>
        <h1 className="text-2xl font-bold mb-1">Cheat Sheets</h1>
        <p className="text-ink-3 text-sm mb-10">Quick reference guides for common tools and techniques.</p>

        {sheets.length === 0 ? (
          <div className="text-center py-24 text-ink-3">
            <p>Cheat sheets are being prepared. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sheets.map(sheet => (
              <div key={sheet.id} className="rounded-xl border border-edge bg-surface-1 p-6">
                <h2 className="font-semibold text-ink mb-1">{sheet.title}</h2>
                {sheet.description && <p className="text-xs text-ink-3 mb-4">{sheet.description}</p>}
                <pre className="text-sm text-ink-2 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">{sheet.content}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
