import { describe, expect, it } from "vitest";
import { haversineDistance } from "./distance.js";

describe("haversineDistance", () => {
  it("is zero for identical points", () => {
    expect(haversineDistance(48.8584, 2.2945, 48.8584, 2.2945)).toBe(0);
  });

  // Eiffel Tower -> Arc de Triomphe is ~2.7 km; allow a small tolerance.
  it("matches a known real-world distance", () => {
    const metres = haversineDistance(48.8584, 2.2945, 48.8738, 2.295);
    expect(metres).toBeGreaterThan(1600);
    expect(metres).toBeLessThan(1800);
  });

  it("is symmetric", () => {
    const ab = haversineDistance(40.0, -74.0, 41.0, -75.0);
    const ba = haversineDistance(41.0, -75.0, 40.0, -74.0);
    expect(ab).toBeCloseTo(ba, 6);
  });
});
