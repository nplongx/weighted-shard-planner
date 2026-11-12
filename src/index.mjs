// One shard plan for the unit tests (test/weighted-sequencer.ts) and the UI checks (verify-ui.mjs).
//
// Each item weighs its measured seconds; an item without a measurement weighs the median. Items are
// placed longest first, each into the lightest shard so far (ties: lower shard, then name), so the
// shards end close together and every caller that sees the same list computes the same plan.

/** The upper median measured duration in seconds, or 1 when no duration is known. */
export function fallbackWeight(durationWeights) {
  const known = [...durationWeights.values()].sort((a, b) => a - b);
  return known.length ? known[Math.floor(known.length / 2)] : 1;
}

/** Item names, longest measured duration first; equal durations sort by name. */
export function byWeight(itemNames, durationWeights) {
  const fallbackDurationSeconds = fallbackWeight(durationWeights);
  const durationForItem = itemName => durationWeights.get(itemName) ?? fallbackDurationSeconds;
  return [...new Set(itemNames)].sort(
    (leftItem, rightItem) => durationForItem(rightItem) - durationForItem(leftItem)
      || (leftItem < rightItem ? -1 : leftItem > rightItem ? 1 : 0),
  );
}

/** Assign each item to a zero-based shard; shardCount is clamped to at least one. */
export function planShards(itemNames, durationWeights, shardCount) {
  const fallbackDurationSeconds = fallbackWeight(durationWeights);
  const shardLoads = Array.from({ length: Math.max(1, shardCount) }, () => 0);
  const assignmentByItem = new Map();
  for (const itemName of byWeight(itemNames, durationWeights)) {
    let lightestShardIndex = 0;
    for (let shardIndex = 1; shardIndex < shardLoads.length; shardIndex++) {
      if (shardLoads[shardIndex] < shardLoads[lightestShardIndex]) lightestShardIndex = shardIndex;
    }
    shardLoads[lightestShardIndex] += durationWeights.get(itemName) ?? fallbackDurationSeconds;
    assignmentByItem.set(itemName, lightestShardIndex);
  }
  return assignmentByItem;
}

/**
 * The UI checks one shard runs, in order: its share of the checks that run (skipped ones take no
 * share), longest first, and the skipped ones named once, by the first shard. Without a shard: all.
 */
export function shardChecks(discoveredChecks, skippedChecks, durationWeights, shardSelection) {
  if (!shardSelection) return [...discoveredChecks];
  const runnableChecks = discoveredChecks.filter(checkName => !skippedChecks.has(checkName));
  const assignmentByCheck = planShards(runnableChecks, durationWeights, shardSelection.count);
  const selectedChecks = runnableChecks.filter(
    checkName => assignmentByCheck.get(checkName) === shardSelection.index - 1,
  );
  const firstShardSkippedChecks = shardSelection.index === 1
    ? discoveredChecks.filter(checkName => skippedChecks.has(checkName))
    : [];
  return [...byWeight(selectedChecks, durationWeights), ...firstShardSkippedChecks];
}

/** `1/3` style shard (1-based) from an environment value, or null when unset or malformed. */
export function parseShard(shardSpec) {
  const match = /^(\d+)\/(\d+)$/.exec(String(shardSpec ?? '').trim());
  if (!match) return null;
  const shardIndex = Number(match[1]), shardCount = Number(match[2]);
  return shardIndex >= 1 && shardIndex <= shardCount ? { index: shardIndex, count: shardCount } : null;
}

/** Parse a JSON map of item names to measured duration in seconds. Invalid input yields an empty map. */
export function readWeights(weightsJson) {
  try {
    const parsedWeights = JSON.parse(weightsJson);
    return new Map(
      Object.entries(parsedWeights).filter(([, durationSeconds]) =>
        typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds >= 0,
      ),
    );
  } catch {
    return new Map();
  }
}
