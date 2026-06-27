import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cacheHistory,
  cacheTrip,
  clearOfflineCache,
  readCachedHistory,
  readCachedTrip,
} from "./offline.js";

// Minimal in-memory localStorage so these stay pure Node tests (no jsdom).
function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", fakeStorage());
});

describe("offline cache", () => {
  it("round-trips the history list", () => {
    const summaries = [{ id: 1, city: "Rome", days: 2, stop_count: 8 }];
    cacheHistory(summaries);
    expect(readCachedHistory()).toEqual(summaries);
  });

  it("returns an empty list when nothing is cached", () => {
    expect(readCachedHistory()).toEqual([]);
  });

  it("round-trips a full trip by id and isolates unknown ids", () => {
    const trip = { id: 7, city: "Rome", days: 2, stops: [{ name: "Forum" }] };
    cacheTrip(trip);
    expect(readCachedTrip(7)).toEqual(trip);
    expect(readCachedTrip(99)).toBeNull();
  });

  it("clears cached history and trips", () => {
    cacheHistory([{ id: 1, city: "Rome" }]);
    cacheTrip({ id: 1, city: "Rome", stops: [] });
    clearOfflineCache();
    expect(readCachedHistory()).toEqual([]);
    expect(readCachedTrip(1)).toBeNull();
  });
});
