import { describe, expect, it } from "vitest";
import {
  PROXIMITY_METRES,
  arrivedStop,
  findNearestStop,
  locatedStops,
} from "./proximity.js";

// Three stops along central Paris. `far` sits ~2.7 km from the Louvre.
const louvre = { name: "Louvre", lat: 48.8606, lng: 2.3376 };
const notreDame = { name: "Notre-Dame", lat: 48.853, lng: 2.3499 };
const eiffel = { name: "Eiffel Tower", lat: 48.8584, lng: 2.2945 };
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

describe("findNearestStop", () => {
  it("returns the closest located stop with its distance", () => {
    // Standing essentially on the Louvre.
    const result = findNearestStop({ lat: 48.8606, lng: 2.3376 }, [eiffel, louvre, notreDame]);
    expect(result.stop).toBe(louvre);
    expect(result.distance).toBeLessThan(5);
  });

  it("ignores un-geocoded stops", () => {
    const result = findNearestStop({ lat: 48.8606, lng: 2.3376 }, [ungeocoded, louvre]);
    expect(result.stop).toBe(louvre);
  });

  it("returns null without a position", () => {
    expect(findNearestStop(null, [louvre])).toBeNull();
  });

  it("returns null when no stops are located", () => {
    expect(findNearestStop({ lat: 48.8606, lng: 2.3376 }, [ungeocoded])).toBeNull();
  });
});

describe("arrivedStop", () => {
  const atLouvre = { lat: 48.8606, lng: 2.3376 };

  it("returns the stop when within range and not yet narrated", () => {
    expect(arrivedStop(atLouvre, [louvre, eiffel], new Set())).toBe(louvre);
  });

  it("returns null when the nearest stop is out of range", () => {
    // Sitting on the Eiffel Tower, the Louvre is ~3 km away — nothing in range.
    const atEiffel = { lat: 48.8584, lng: 2.2945 };
    expect(arrivedStop(atEiffel, [louvre], new Set())).toBeNull();
  });

  it("returns null when the in-range stop was already narrated", () => {
    expect(arrivedStop(atLouvre, [louvre], new Set(["Louvre"]))).toBeNull();
  });

  it("only fires for the nearest stop, even if several are in range", () => {
    // A radius wide enough to cover multiple stops still narrates just the closest.
    const result = arrivedStop(atLouvre, [notreDame, louvre], new Set(), 5000);
    expect(result).toBe(louvre);
  });

  it("defaults to the PROXIMITY_METRES radius", () => {
    // ~80 m north of the Louvre: inside the default 100 m radius.
    const justOutside = { lat: 48.8613, lng: 2.3376 };
    expect(arrivedStop(justOutside, [louvre], new Set())).toBe(louvre);
    expect(PROXIMITY_METRES).toBe(100);
  });
});
