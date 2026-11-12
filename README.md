# weighted-shard-planner

Small dependency-free ESM library for deterministic weighted partitioning and check ordering.

Uses longest-processing-time-first (LPT) greedy assignment: deduplicate item names, sort by descending measured weight (name breaks ties), then assign each item to the currently lightest shard (lowest index breaks load ties).

## Terminology

See [TERMINOLOGY.md](TERMINOLOGY.md) for shared identifier, lifecycle, evidence, time-unit, and compatibility conventions.

## Install

```sh
npm install github:nplongx/weighted-shard-planner#v0.1.1
```

Requires Node.js 22 or newer. Package contains ESM runtime and TypeScript declarations; no runtime or development dependencies.

## API

```js
import {
  fallbackWeight,
  byWeight,
  planShards,
  shardChecks,
  parseShard,
  readWeights,
} from 'weighted-shard-planner';
```

- `fallbackWeight(durationWeights)` returns the upper median measured duration in seconds, or `1` when map is empty.
- `byWeight(itemNames, durationWeights)` deduplicates and returns item names longest-first; equal durations sort lexicographically.
- `planShards(itemNames, durationWeights, shardCount)` returns `Map<string, number>` with zero-based shard indices. `shardCount` is clamped to at least one. Items absent from the weights map receive the fallback duration.
- `shardChecks(discoveredChecks, skippedChecks, durationWeights, shardSelection)` returns all discovered checks unchanged when `shardSelection` is `null`. For a one-based `{ index, count }` selection, runnable checks are balanced across the declared shards and ordered longest-first; skipped checks are listed only on shard 1.
- `parseShard(shardSpec)` parses a one-based `index/count` string into `ShardSelection`, returning `null` for unset or malformed values.
- `readWeights(weightsJson)` reads a JSON object into a map, retaining only finite, non-negative duration weights in seconds. Invalid JSON returns an empty map.

Weights represent measured duration in seconds. The planner makes deterministic assignments for the same item set and weights; it is a greedy heuristic, not an optimal scheduling solver. Weight refresh and test discovery remain the caller's responsibility.

## Example

```js
import { planShards, readWeights } from 'weighted-shard-planner';

const weights = readWeights('{"renderer.test.ts": 180, "protocol.test.ts": 12}');
const plan = planShards(
  ['renderer.test.ts', 'protocol.test.ts', 'new.test.ts'],
  weights,
  2,
);

console.log(Object.fromEntries(plan));
```

## Development

```sh
npm test
npm run check
npm pack --dry-run
```

Tests use Node's built-in `node:test`; no Vitest installation is required.

## Provenance

Created from immutable source snapshot `a5e145c0a61c3acfffc23f89bccc4d6a3941d12d`. Caller-specific tests were ported to Node's built-in test runner. The published package has no runtime or development dependencies and does not require the original application.

## License

MIT. See [LICENSE](LICENSE).
