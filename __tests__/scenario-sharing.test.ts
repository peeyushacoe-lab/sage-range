import { describe, it, expect } from "vitest";
import {
  canViewScenario,
  canEditScenario,
  canCloneScenario,
  canRateScenario,
  appearsInGallery,
  canSetVisibility,
  canReportScenario,
  reportPriority,
  isValidStars,
  summariseRatings,
  rankingScore,
  cloneTitle,
  RATING_PRIOR_MEAN,
  type ScenarioAcl,
  type ScenarioViewer,
} from "@/lib/scenario-sharing";

const scenario = (over: Partial<ScenarioAcl> = {}): ScenarioAcl => ({
  createdById: "author",
  visibility: "COMMUNITY",
  published: true,
  ...over,
});

const viewer = (over: Partial<ScenarioViewer> = {}): ScenarioViewer => ({
  userId: "someone",
  isAdmin: false,
  ...over,
});

describe("canViewScenario", () => {
  it("lets anyone open a community scenario", () => {
    expect(canViewScenario(scenario(), viewer())).toBe(true);
  });

  it("lets anyone with the link open an unlisted scenario", () => {
    expect(canViewScenario(scenario({ visibility: "UNLISTED" }), viewer())).toBe(true);
  });

  it("hides a private scenario from everyone else", () => {
    expect(canViewScenario(scenario({ visibility: "PRIVATE" }), viewer())).toBe(false);
  });

  it("always lets the author open their own", () => {
    expect(
      canViewScenario(scenario({ visibility: "PRIVATE" }), viewer({ userId: "author" })),
    ).toBe(true);
  });

  it("lets an admin open anything, for moderation", () => {
    expect(
      canViewScenario(scenario({ visibility: "PRIVATE" }), viewer({ isAdmin: true })),
    ).toBe(true);
  });

  it("denies an unrecognised visibility rather than assuming it is shareable", () => {
    expect(canViewScenario(scenario({ visibility: "SOMETHING" as never }), viewer())).toBe(false);
  });

  it("ignores the legacy published flag when deciding visibility", () => {
    // published=true must not resurrect a scenario the author made private.
    expect(
      canViewScenario(scenario({ visibility: "PRIVATE", published: true }), viewer()),
    ).toBe(false);
  });
});

describe("canEditScenario", () => {
  it("allows the author and admins only", () => {
    expect(canEditScenario(scenario(), viewer({ userId: "author" }))).toBe(true);
    expect(canEditScenario(scenario(), viewer({ isAdmin: true }))).toBe(true);
    expect(canEditScenario(scenario(), viewer())).toBe(false);
  });
});

describe("canCloneScenario", () => {
  it("allows cloning anything you can open", () => {
    expect(canCloneScenario(scenario(), viewer())).toBe(true);
    expect(canCloneScenario(scenario({ visibility: "UNLISTED" }), viewer())).toBe(true);
  });

  it("allows an author to branch their own private scenario", () => {
    expect(
      canCloneScenario(scenario({ visibility: "PRIVATE" }), viewer({ userId: "author" })),
    ).toBe(true);
  });

  it("refuses to clone something you cannot open", () => {
    expect(canCloneScenario(scenario({ visibility: "PRIVATE" }), viewer())).toBe(false);
  });
});

describe("canRateScenario", () => {
  it("allows a viewer to rate a community scenario", () => {
    expect(canRateScenario(scenario(), viewer())).toBe(true);
  });

  it("stops an author rating their own work", () => {
    expect(canRateScenario(scenario(), viewer({ userId: "author" }))).toBe(false);
  });

  it("stops an admin rating their own work either", () => {
    expect(
      canRateScenario(scenario({ createdById: "boss" }), viewer({ userId: "boss", isAdmin: true })),
    ).toBe(false);
  });

  it("refuses ratings on a private scenario", () => {
    expect(
      canRateScenario(scenario({ visibility: "PRIVATE" }), viewer({ isAdmin: true })),
    ).toBe(false);
  });
});

describe("appearsInGallery", () => {
  it("lists only community scenarios", () => {
    expect(appearsInGallery(scenario())).toBe(true);
    expect(appearsInGallery(scenario({ visibility: "UNLISTED" }))).toBe(false);
    expect(appearsInGallery(scenario({ visibility: "PRIVATE" }))).toBe(false);
  });
});

describe("isValidStars", () => {
  it("accepts 1 to 5 whole stars only", () => {
    expect(isValidStars(1)).toBe(true);
    expect(isValidStars(5)).toBe(true);
    expect(isValidStars(0)).toBe(false);
    expect(isValidStars(6)).toBe(false);
    expect(isValidStars(3.5)).toBe(false);
    expect(isValidStars(NaN)).toBe(false);
  });
});

describe("summariseRatings", () => {
  it("reports an unrated scenario as zero-count rather than badly rated", () => {
    expect(summariseRatings([])).toEqual({ average: 0, count: 0 });
  });

  it("averages to one decimal place", () => {
    expect(summariseRatings([5, 4, 4])).toEqual({ average: 4.3, count: 3 });
  });

  it("discards out-of-range values instead of skewing the mean", () => {
    expect(summariseRatings([5, 99, 0, 3])).toEqual({ average: 4, count: 2 });
  });
});

describe("rankingScore", () => {
  it("pulls a single perfect rating below a well-established good one", () => {
    const oneFiveStar = rankingScore({ average: 5, count: 1 });
    const manyGood = rankingScore({ average: 4.6, count: 50 });
    expect(manyGood).toBeGreaterThan(oneFiveStar);
  });

  it("returns the prior mean for an unrated scenario", () => {
    expect(rankingScore({ average: 0, count: 0 })).toBe(RATING_PRIOR_MEAN);
  });

  it("converges towards the true average as ratings accumulate", () => {
    const few = rankingScore({ average: 5, count: 3 });
    const many = rankingScore({ average: 5, count: 500 });
    expect(many).toBeGreaterThan(few);
    expect(many).toBeLessThanOrEqual(5);
  });
});

describe("moderation — takedown", () => {
  const down = (over: Partial<ScenarioAcl> = {}) =>
    scenario({ takenDownAt: new Date("2026-08-01T00:00:00Z"), ...over });

  it("removes it from the gallery", () => {
    expect(appearsInGallery(down())).toBe(false);
  });

  it("hides it from everyone but its author and admins", () => {
    expect(canViewScenario(down(), viewer())).toBe(false);
    expect(canViewScenario(down(), viewer({ userId: "author" }))).toBe(true);
    expect(canViewScenario(down(), viewer({ isAdmin: true }))).toBe(true);
  });

  it("stops the author republishing it", () => {
    // The whole point: a takedown that the author can undo is not a takedown.
    expect(canSetVisibility(down(), viewer({ userId: "author" }), "COMMUNITY")).toBe(false);
  });

  it("still lets the author make it private or unlisted", () => {
    expect(canSetVisibility(down(), viewer({ userId: "author" }), "PRIVATE")).toBe(true);
    expect(canSetVisibility(down(), viewer({ userId: "author" }), "UNLISTED")).toBe(true);
  });

  it("lets an admin restore it", () => {
    expect(canSetVisibility(down(), viewer({ isAdmin: true }), "COMMUNITY")).toBe(true);
  });

  it("cannot be reintroduced by cloning, even by an admin", () => {
    expect(canCloneScenario(down(), viewer())).toBe(false);
    expect(canCloneScenario(down(), viewer({ userId: "author" }))).toBe(false);
    expect(canCloneScenario(down(), viewer({ isAdmin: true }))).toBe(false);
  });

  it("cannot be rated", () => {
    expect(canRateScenario(down(), viewer())).toBe(false);
  });

  it("cannot be reported again", () => {
    expect(canReportScenario(down(), viewer())).toBe(false);
  });

  it("leaves an untouched scenario unaffected", () => {
    expect(appearsInGallery(scenario())).toBe(true);
    expect(canSetVisibility(scenario(), viewer({ userId: "author" }), "COMMUNITY")).toBe(true);
  });
});

describe("canReportScenario", () => {
  it("lets a viewer report community content", () => {
    expect(canReportScenario(scenario(), viewer())).toBe(true);
  });

  it("stops you reporting your own work", () => {
    expect(canReportScenario(scenario(), viewer({ userId: "author" }))).toBe(false);
  });

  it("has nothing to report on a private scenario", () => {
    expect(canReportScenario(scenario({ visibility: "PRIVATE" }), viewer())).toBe(false);
  });

  it("allows reporting unlisted content, which is still in circulation", () => {
    expect(canReportScenario(scenario({ visibility: "UNLISTED" }), viewer())).toBe(true);
  });
});

describe("canSetVisibility", () => {
  it("refuses anyone who cannot edit", () => {
    expect(canSetVisibility(scenario(), viewer(), "PRIVATE")).toBe(false);
  });
});

describe("reportPriority", () => {
  it("counts distinct reporters, not reports", () => {
    expect(
      reportPriority([{ reporterId: "a" }, { reporterId: "a" }, { reporterId: "a" }]),
    ).toBe(1);
    expect(
      reportPriority([{ reporterId: "a" }, { reporterId: "b" }, { reporterId: "c" }]),
    ).toBe(3);
  });

  it("is zero with no reports", () => {
    expect(reportPriority([])).toBe(0);
  });
});

describe("cloneTitle", () => {
  it("marks a first copy", () => {
    expect(cloneTitle("Ransomware Drill")).toBe("Ransomware Drill (copy)");
  });

  it("numbers subsequent copies instead of nesting them", () => {
    expect(cloneTitle("Ransomware Drill (copy)")).toBe("Ransomware Drill (copy 2)");
    expect(cloneTitle("Ransomware Drill (copy 2)")).toBe("Ransomware Drill (copy 3)");
  });

  it("is case-insensitive about the existing marker", () => {
    expect(cloneTitle("Drill (Copy)")).toBe("Drill (copy 2)");
  });

  it("trims surrounding whitespace", () => {
    expect(cloneTitle("  Drill  ")).toBe("Drill (copy)");
  });
});
