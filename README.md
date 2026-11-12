# weighted-shard-planner

Small dependency-free ESM library for deterministic weighted partitioning and check ordering.

Uses longest-processing-time-first (LPT) greedy assignment: deduplicate item names, sort by descending measured weight (name breaks ties), then assign each item to the currently lightest shard (lowest index breaks load ties).

## Install

```sh
npm install weighted-shard-planner
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

- `fallbackWeight(weights)` returns the upper median known weight, or `1` when map is empty.
- `byWeight(items, weights)` deduplicates and returns item names longest-first; equal weights sort lexicographically.
- `planShards(items, weights, count)` returns `Map<string, number>` with zero-based shard indices. Count is clamped to at least one. Items absent from the weights map receive the fallback weight.
- `shardChecks(found, skip, weights, shard)` returns all found checks unchanged when `shard` is `null`. For a `{ index, count }` shard, runnable checks are balanced across the declared shards and ordered longest-first; skipped checks are listed only on shard 1.
- `parseShard(value)` parses a one-based `index/count` string, returning `null` for unset or malformed values.
- `readWeights(text)` reads a JSON object into a map, retaining only finite, non-negative numeric weights. Invalid JSON returns an empty map.

Weights represent measured duration (typically seconds). The planner makes deterministic assignments for the same item set and weights; it is a greedy heuristic, not an optimal scheduling solver. Weight refresh and test discovery remain the caller's responsibility.

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

Extracted without source modifications from `scripts/shard-plan.mjs` and `scripts/shard-plan.d.mts` in [`nplongx/chat-on-steroids`](https://github.com/nplongx/chat-on-steroids), source commit `a5e145c0a61c3acfffc23f89bccc4d6a3941d12d`. The original caller-specific Vitest tests were ported to Node's built-in test runner. No Chat On Steroids runtime, browser, Electron, or UI dependencies are included.

## License

MIT. See [LICENSE](LICENSE).
