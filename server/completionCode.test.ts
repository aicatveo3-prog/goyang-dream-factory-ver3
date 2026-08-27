import { describe, expect, it } from "vitest";
import { createPrizeCode } from "./db";

describe("createPrizeCode", () => {
  it("creates a readable one-time code with four 4-character groups", () => {
    expect(createPrizeCode()).toMatch(/^YE-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it("avoids duplicate values across a short issuance run", () => {
    const codes = new Set(Array.from({ length: 100 }, () => createPrizeCode()));
    expect(codes.size).toBe(100);
  });
});
