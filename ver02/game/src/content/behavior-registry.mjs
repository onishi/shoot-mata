export const DEFAULT_BEHAVIOR_REGISTRY = Object.freeze({
  background: Object.freeze(["parallax-loop"]),
  enemy: Object.freeze(["drift-left", "sine-left"]),
  spawn: Object.freeze(["lane-sequence", "lane-seeded"]),
  hazard: Object.freeze(["closing-corridor"]),
  boss: Object.freeze(["boss-entry", "boss-sweep", "boss-burst"]),
});

export function hasBehavior(registry, kind, id) {
  const collection = registry?.[kind];
  if (Array.isArray(collection)) return collection.includes(id);
  return collection instanceof Set && collection.has(id);
}
