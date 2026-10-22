export const DEFAULT_BEHAVIOR_REGISTRY = Object.freeze({
  background: Object.freeze(["parallax-loop"]),
  enemy: Object.freeze([
    "drift-left", "sine-left", "armored-drift",
    "current-rider", "cover-turret", "dive-striker",
  ]),
  spawn: Object.freeze(["lane-sequence", "lane-seeded"]),
  hazard: Object.freeze([
    "closing-corridor", "alternating-current", "shutter-cover", "charged-cloud",
  ]),
  boss: Object.freeze([
    "boss-entry", "boss-sweep", "boss-burst", "boss-crossfire", "boss-core-rush",
    "boss-current-climb", "boss-shutter-barrage", "boss-thunder-dive",
  ]),
});

export function hasBehavior(registry, kind, id) {
  const collection = registry?.[kind];
  if (Array.isArray(collection)) return collection.includes(id);
  return collection instanceof Set && collection.has(id);
}
