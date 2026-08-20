import { describe, it, expect } from "vitest";
import {
  monthWindowUTC,
  nextMonth,
  monthOf,
  championshipSlug,
  championshipTitle,
  rankEntries,
  tierForRank,
  tierEarnsCertificate,
  championshipCertCode,
  MIN_ENTRANTS_FOR_FINALISTS,
} from "@/lib/championship-scoring";

const at = (iso: string) => new Date(iso);

describe("monthWindowUTC", () => {
  it("spans the whole month in UTC", () => {
    const { startsAt, endsAt } = monthWindowUTC(2026, 8);
    expect(startsAt.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(endsAt.toISOString()).toBe("2026-08-31T23:59:59.999Z");
  });

  it("handles December without spilling into the next year", () => {
    const { startsAt, endsAt } = monthWindowUTC(2026, 12);
    expect(startsAt.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(endsAt.toISOString()).toBe("2026-12-31T23:59:59.999Z");
  });

  it("handles February in a leap year", () => {
    expect(monthWindowUTC(2028, 2).endsAt.toISOString()).toBe("2028-02-29T23:59:59.999Z");
  });

  it("handles February in a non-leap year", () => {
    expect(monthWindowUTC(2026, 2).endsAt.toISOString()).toBe("2026-02-28T23:59:59.999Z");
  });

  it("never leaves a gap between consecutive months", () => {
    const august = monthWindowUTC(2026, 8);
    const september = monthWindowUTC(2026, 9);
    expect(september.startsAt.getTime() - august.endsAt.getTime()).toBe(1);
  });

  it("rejects an out-of-range month", () => {
    expect(() => monthWindowUTC(2026, 0)).toThrow(RangeError);
    expect(() => monthWindowUTC(2026, 13)).toThrow(RangeError);
  });
});

describe("nextMonth", () => {
  it("advances within a year", () => {
    expect(nextMonth(2026, 5)).toEqual({ year: 2026, month: 6 });
  });

  it("rolls December into January of the next year", () => {
    expect(nextMonth(2026, 12)).toEqual({ year: 2027, month: 1 });
  });
});

describe("monthOf", () => {
  it("reads the UTC month, not the local one", () => {
    // 23:30 on 31 December UTC is already January in some local zones; the
    // championship must key off UTC or the rollover fires against the wrong month.
    expect(monthOf(at("2026-12-31T23:30:00.000Z"))).toEqual({ year: 2026, month: 12 });
    expect(monthOf(at("2027-01-01T00:30:00.000Z"))).toEqual({ year: 2027, month: 1 });
  });
});

describe("championshipSlug / championshipTitle", () => {
  it("zero-pads the month so slugs sort by date", () => {
    expect(championshipSlug(2026, 3)).toBe("championship-2026-03");
    expect(
      ["championship-2026-10", championshipSlug(2026, 3)].sort()[0],
    ).toBe("championship-2026-03");
  });

  it("names the month", () => {
    expect(championshipTitle(2026, 1)).toBe("January 2026 Championship");
    expect(championshipTitle(2026, 12)).toBe("December 2026 Championship");
  });
});

describe("rankEntries", () => {
  it("orders by score descending", () => {
    const ranked = rankEntries([
      { userId: "a", score: 10, lastSolvedAt: at("2026-08-02T00:00:00Z") },
      { userId: "b", score: 30, lastSolvedAt: at("2026-08-02T00:00:00Z") },
      { userId: "c", score: 20, lastSolvedAt: at("2026-08-02T00:00:00Z") },
    ]);
    expect(ranked.map((r) => r.userId)).toEqual(["b", "c", "a"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("breaks a score tie in favour of whoever got there first", () => {
    const ranked = rankEntries([
      { userId: "late", score: 100, lastSolvedAt: at("2026-08-20T12:00:00Z") },
      { userId: "early", score: 100, lastSolvedAt: at("2026-08-03T09:00:00Z") },
    ]);
    expect(ranked[0].userId).toBe("early");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
  });

  it("gives a genuine tie the same rank and skips the next placing", () => {
    const same = at("2026-08-10T00:00:00Z");
    const ranked = rankEntries([
      { userId: "a", score: 50, lastSolvedAt: same },
      { userId: "b", score: 50, lastSolvedAt: same },
      { userId: "c", score: 10, lastSolvedAt: same },
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it("places entrants who never scored last", () => {
    const ranked = rankEntries([
      { userId: "none", score: 0, lastSolvedAt: null },
      { userId: "some", score: 5, lastSolvedAt: at("2026-08-04T00:00:00Z") },
    ]);
    expect(ranked[0].userId).toBe("some");
    expect(ranked[1].userId).toBe("none");
  });

  it("is stable for entrants tied on score with no timestamp", () => {
    const first = rankEntries([
      { userId: "b", score: 0, lastSolvedAt: null },
      { userId: "a", score: 0, lastSolvedAt: null },
    ]);
    const second = rankEntries([
      { userId: "a", score: 0, lastSolvedAt: null },
      { userId: "b", score: 0, lastSolvedAt: null },
    ]);
    expect(first.map((r) => r.userId)).toEqual(second.map((r) => r.userId));
  });

  it("returns an empty list unchanged", () => {
    expect(rankEntries([])).toEqual([]);
  });

  it("does not mutate its input", () => {
    const input = [
      { userId: "a", score: 1, lastSolvedAt: null },
      { userId: "b", score: 9, lastSolvedAt: null },
    ];
    rankEntries(input);
    expect(input.map((e) => e.userId)).toEqual(["a", "b"]);
  });
});

describe("tierForRank", () => {
  it("names first place champion", () => {
    expect(tierForRank(1, 50)).toBe("CHAMPION");
  });

  it("gives second and third a medal", () => {
    expect(tierForRank(2, 50)).toBe("MEDALLIST");
    expect(tierForRank(3, 50)).toBe("MEDALLIST");
  });

  it("gives the top tenth finalist status in a large field", () => {
    expect(tierForRank(4, 100)).toBe("FINALIST");
    expect(tierForRank(10, 100)).toBe("FINALIST");
    expect(tierForRank(11, 100)).toBe("COMPETITOR");
  });

  it("awards no finalists in a field too small for a percentage to mean anything", () => {
    expect(tierForRank(4, MIN_ENTRANTS_FOR_FINALISTS - 1)).toBe("COMPETITOR");
  });

  it("never lets the finalist cutoff fall below the podium", () => {
    // 10% of 10 is 1, which would otherwise put the cutoff beneath the medals.
    expect(tierForRank(4, 10)).toBe("COMPETITOR");
    expect(tierForRank(3, 10)).toBe("MEDALLIST");
  });

  it("rejects a non-positive rank", () => {
    expect(() => tierForRank(0, 10)).toThrow(RangeError);
  });
});

describe("tierEarnsCertificate", () => {
  it("issues for the podium only", () => {
    expect(tierEarnsCertificate("CHAMPION")).toBe(true);
    expect(tierEarnsCertificate("MEDALLIST")).toBe(true);
    expect(tierEarnsCertificate("COMPETITOR")).toBe(false);
  });

  // FINALIST used to earn one. In a field of forty that minted four extra
  // certificates a month for placings nobody announces.
  it("does not issue below the podium", () => {
    expect(tierEarnsCertificate("FINALIST")).toBe(false);
  });

  // The tier still exists and still shows on the board; it just carries no
  // certificate, so rank 4 in a large field is not silently retiered.
  it("still ranks finalists as finalists", () => {
    expect(tierForRank(4, 40)).toBe("FINALIST");
  });
});

describe("championshipCertCode", () => {
  it("encodes year, zero-padded month and rank", () => {
    const code = championshipCertCode(2026, 8, 1, () => 0);
    expect(code.startsWith("MCH-2026-08-1-")).toBe(true);
  });

  it("omits ambiguous characters", () => {
    const code = championshipCertCode(2026, 8, 2, () => 0.999999);
    const suffix = code.split("-").pop()!;
    expect(suffix).toHaveLength(6);
    expect(/[IO01]/.test(suffix)).toBe(false);
  });
});
