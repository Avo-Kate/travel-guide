// Only stops with coordinates can be placed on the map; un-geocoded stops
// (lat/lng null) are skipped. Used by both the map and the itinerary list.
export function locatedStops(stops) {
  return (stops || []).filter((s) => s.lat != null && s.lng != null);
}
