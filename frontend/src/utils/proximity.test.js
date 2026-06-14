import { describe, expect, it } from "vitest";
import { locatedStops } from "./proximity.js";

const louvre = { name: "Louvre", lat: 48.8606, lng: 2.3376 };
const notreDame = { name: "Notre-Dame", lat: 48.853, lng: 2.3499 };
const ungeocoded = { name: "Mystery Stop", lat: null, lng: null };

describe("locatedStops", () => {
  it("keeps only stops with both coordinates", () => {
    expect(locatedStops([louvre, ungeocoded, notreDame])).toEqual([louvre, notreDame]);
  });

  it("treats null/undefined input as empty", () => {
    expect(locatedStops(null)).toEqual([]);
    expect(locatedStops(undefined)).toEqual([]);
  });
});
