import { describe, it, expect } from "vitest";
import {
  canAccessCompetition,
  inviteCodeMatches,
  visibilityLabel,
  visibleCompetitionFilter,
  type CompetitionAcl,
  type ViewerContext,
} from "@/lib/competition-access";

const acl = (over: Partial<CompetitionAcl> = {}): CompetitionAcl => ({
  visibility: "PUBLIC",
  organizationId: null,
  cohortId: null,
  inviteCode: null,
  ...over,
});

const viewer = (over: Partial<ViewerContext> = {}): ViewerContext => ({
  organizationIds: [],
  cohortIds: [],
  hasEntry: false,
  ...over,
});

describe("canAccessCompetition", () => {
  it("allows anyone into a public competition", () => {
    expect(canAccessCompetition(acl(), viewer())).toBe(true);
  });

  it("allows an organization member into their org's competition", () => {
    const c = acl({ visibility: "ORGANIZATION", organizationId: "org-1" });
    expect(canAccessCompetition(c, viewer({ organizationIds: ["org-1"] }))).toBe(true);
  });

  it("denies a non-member of the owning organization", () => {
    const c = acl({ visibility: "ORGANIZATION", organizationId: "org-1" });
    expect(canAccessCompetition(c, viewer({ organizationIds: ["org-2"] }))).toBe(false);
  });

  it("denies a user with no organization at all", () => {
    const c = acl({ visibility: "ORGANIZATION", organizationId: "org-1" });
    expect(canAccessCompetition(c, viewer())).toBe(false);
  });

  it("allows a cohort member into their classroom competition", () => {
    const c = acl({ visibility: "COHORT", cohortId: "co-1" });
    expect(canAccessCompetition(c, viewer({ cohortIds: ["co-1"] }))).toBe(true);
  });

  it("denies a member of a different cohort", () => {
    const c = acl({ visibility: "COHORT", cohortId: "co-1" });
    expect(canAccessCompetition(c, viewer({ cohortIds: ["co-9"] }))).toBe(false);
  });

  // ── Fail-closed misconfiguration ────────────────────────────────────────

  it("denies an ORGANIZATION competition with no organization set", () => {
    const c = acl({ visibility: "ORGANIZATION", organizationId: null });
    expect(canAccessCompetition(c, viewer({ organizationIds: ["org-1"] }))).toBe(false);
  });

  it("denies a COHORT competition with no cohort set", () => {
    const c = acl({ visibility: "COHORT", cohortId: null });
    expect(canAccessCompetition(c, viewer({ cohortIds: ["co-1"] }))).toBe(false);
  });

  it("denies an INVITE_ONLY competition with no code set, even with no code sent", () => {
    const c = acl({ visibility: "INVITE_ONLY", inviteCode: null });
    expect(canAccessCompetition(c, viewer(), null)).toBe(false);
    expect(canAccessCompetition(c, viewer(), "")).toBe(false);
  });

  it("denies an unrecognised visibility value", () => {
    const c = acl({ visibility: "SOMETHING_NEW" as never });
    expect(canAccessCompetition(c, viewer())).toBe(false);
  });

  // ── Invite codes ────────────────────────────────────────────────────────

  it("admits a correct invite code", () => {
    const c = acl({ visibility: "INVITE_ONLY", inviteCode: "CYBER-2026" });
    expect(canAccessCompetition(c, viewer(), "CYBER-2026")).toBe(true);
  });

  it("ignores case and surrounding whitespace in an invite code", () => {
    const c = acl({ visibility: "INVITE_ONLY", inviteCode: "CYBER-2026" });
    expect(canAccessCompetition(c, viewer(), "  cyber-2026 ")).toBe(true);
  });

  it("rejects a wrong or missing invite code", () => {
    const c = acl({ visibility: "INVITE_ONLY", inviteCode: "CYBER-2026" });
    expect(canAccessCompetition(c, viewer(), "NOPE")).toBe(false);
    expect(canAccessCompetition(c, viewer())).toBe(false);
  });

  it("does not let an invite code unlock an organization competition", () => {
    const c = acl({
      visibility: "ORGANIZATION",
      organizationId: "org-1",
      inviteCode: "CYBER-2026",
    });
    expect(canAccessCompetition(c, viewer(), "CYBER-2026")).toBe(false);
  });

  // ── Existing entrants ───────────────────────────────────────────────────

  it("keeps access for someone who already entered, even if since restricted", () => {
    const c = acl({ visibility: "ORGANIZATION", organizationId: "org-1" });
    expect(canAccessCompetition(c, viewer({ hasEntry: true }))).toBe(true);
  });
});

describe("inviteCodeMatches", () => {
  it("never matches when no code is configured", () => {
    expect(inviteCodeMatches(null, "")).toBe(false);
    expect(inviteCodeMatches(null, null)).toBe(false);
    expect(inviteCodeMatches("", "")).toBe(false);
    expect(inviteCodeMatches("   ", "")).toBe(false);
  });

  it("matches exactly once normalised", () => {
    expect(inviteCodeMatches("ABC123", "abc123")).toBe(true);
    expect(inviteCodeMatches("ABC123", "ABC124")).toBe(false);
  });
});

describe("visibleCompetitionFilter", () => {
  it("only offers public and already-entered events to an unaffiliated user", () => {
    const f = visibleCompetitionFilter("u1", { organizationIds: [], cohortIds: [] });
    expect(f.published).toBe(true);
    expect(f.OR).toHaveLength(2);
    expect(f.OR).toContainEqual({ visibility: "PUBLIC" });
    expect(f.OR).toContainEqual({ entries: { some: { userId: "u1" } } });
  });

  it("adds org and cohort clauses when the user has memberships", () => {
    const f = visibleCompetitionFilter("u1", {
      organizationIds: ["org-1"],
      cohortIds: ["co-1"],
    });
    expect(f.OR).toHaveLength(4);
    expect(f.OR).toContainEqual({
      visibility: "ORGANIZATION",
      organizationId: { in: ["org-1"] },
    });
    expect(f.OR).toContainEqual({ visibility: "COHORT", cohortId: { in: ["co-1"] } });
  });

  it("never lists invite-only events the user has not entered", () => {
    const f = visibleCompetitionFilter("u1", {
      organizationIds: ["org-1"],
      cohortIds: ["co-1"],
    });
    const mentionsInviteOnly = JSON.stringify(f.OR).includes("INVITE_ONLY");
    expect(mentionsInviteOnly).toBe(false);
  });
});

describe("visibilityLabel", () => {
  it("labels every visibility", () => {
    expect(visibilityLabel("PUBLIC")).toBe("Open");
    expect(visibilityLabel("ORGANIZATION")).toBe("Organization");
    expect(visibilityLabel("COHORT")).toBe("Classroom");
    expect(visibilityLabel("INVITE_ONLY")).toBe("Invite only");
    expect(visibilityLabel("WHATEVER" as never)).toBe("Restricted");
  });
});
