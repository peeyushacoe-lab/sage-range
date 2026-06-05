// Builds a narrative context string from recent events, fed to Ollama before generation.
// This is what gives the AI "memory" — it knows what happened before it speaks.

type EventSummary = {
  type: string;
  actor: string;
  narrative: string | null;
};

export function buildNarrativeContext(
  events: EventSummary[],
  companyName: string,
  maxEvents = 6
): string {
  const relevant = events
    .filter((e) => e.narrative && e.actor !== "ANALYST")
    .slice(-maxEvents)
    .map((e) => e.narrative as string);

  if (relevant.length === 0) return "";

  return `\n\nRecent incident history at ${companyName}:\n${relevant.map((n, i) => `${i + 1}. ${n}`).join("\n")}`;
}

// Builds a short analyst decision summary for context
export function buildDecisionContext(
  events: EventSummary[]
): string {
  const decisions = events
    .filter((e) => e.type === "STUDENT_ACTION" && e.narrative)
    .slice(-4)
    .map((e) => e.narrative as string);

  if (decisions.length === 0) return "";

  return `\n\nAnalyst decisions so far:\n${decisions.map((d) => `- ${d}`).join("\n")}`;
}
