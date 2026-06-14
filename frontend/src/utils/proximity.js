import { haversineDistance } from "./distance.js";

// How close (metres) the traveller must be to a stop before Guide Mode narrates
// it. Roughly a city-block radius — close enough to be "here", loose enough to
// absorb consumer-GPS jitter.
export const PROXIMITY_METRES = 100;

// Only stops with coordinates can be placed on the map or used for proximity;
// un-geocoded stops (lat/lng null) are skipped everywhere in Guide Mode.
export function locatedStops(stops) {
  return (stops || []).filter((s) => s.lat != null && s.lng != null);
}

// Nearest located stop to a position, as { stop, distance } in metres, or null
// when there's no position or no located stops to compare against.
export function findNearestStop(position, stops) {
  if (!position) return null;

  let nearest = null;
  for (const stop of locatedStops(stops)) {
    const distance = haversineDistance(
      position.lat,
      position.lng,
      stop.lat,
      stop.lng
    );
    if (nearest === null || distance < nearest.distance) {
      nearest = { stop, distance };
    }
  }
  return nearest;
}

// The stop the traveller has just "arrived" at and should hear narrated, or
// null. A stop qualifies only when it is the nearest one, within `radius`
// metres, and hasn't been narrated yet — so each stop fires exactly once.
export function arrivedStop(position, stops, narrated, radius = PROXIMITY_METRES) {
  const nearest = findNearestStop(position, stops);
  if (!nearest || nearest.distance > radius) return null;
  if (narrated && narrated.has(nearest.stop.name)) return null;
  return nearest.stop;
}