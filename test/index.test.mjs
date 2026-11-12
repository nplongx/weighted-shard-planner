import assert from 'node:assert/strict';
import test from 'node:test';

import {
  byWeight,
  fallbackWeight,
  parseShard,
  planShards,
  readWeights,
  shardChecks,
} from '../src/index.mjs';

const durationWeights = new Map([
  ['a', 200],
  ['b', 150],
  ['c', 100],
  ['d', 90],
  ['e', 60],
  ['f', 10],
]);

test('fallback weight is the upper median, or one for an empty map', () => {
  assert.equal(fallbackWeight(durationWeights), 100);
  assert.equal(fallbackWeight(new Map([['a', 2], ['b', 8]])), 8);
  assert.equal(fallbackWeight(new Map()), 1);
});

test('places every item in exactly one shard and keeps loads reasonably close', () => {
  const itemNames = ['f', 'e', 'd', 'c', 'b', 'a', 'new'];
  const assignmentByItem = planShards(itemNames, durationWeights, 3);
  assert.deepEqual([...assignmentByItem.keys()].sort(), [...itemNames].sort());
  const shardLoads = [0, 0, 0];
  for (const [itemName, shardIndex] of assignmentByItem) {
    shardLoads[shardIndex] += durationWeights.get(itemName) ?? 90;
  }
  assert.ok(Math.max(...shardLoads) - Math.min(...shardLoads) <= 200);
  assert.deepEqual(new Set(assignmentByItem.values()), new Set([0, 1, 2]));
});

test('produces the same plan regardless of input order and duplicate occurrences', () => {
  const firstAssignment = planShards(['a', 'b', 'c', 'd', 'e', 'f'], durationWeights, 2);
  const reorderedAssignment = planShards(['f', 'd', 'b', 'e', 'c', 'a', 'a'], durationWeights, 2);
  assert.deepEqual([...reorderedAssignment].sort(), [...firstAssignment].sort());
});

test('orders longest first and breaks equal-weight ties by name', () => {
  assert.deepEqual(
    byWeight(['f', 'x', 'a', 'w'], new Map([['a', 5], ['f', 1], ['w', 3], ['x', 3]])),
    ['a', 'w', 'x', 'f'],
  );
});

test('uses one shard when count is zero or less', () => {
  assert.deepEqual(new Set(planShards(['a', 'b'], durationWeights, 1).values()), new Set([0]));
  assert.deepEqual(new Set(planShards(['a', 'b'], durationWeights, 0).values()), new Set([0]));
});

test('parses one-based shard indexes and rejects malformed values', () => {
  const cases = [
    ['1/3', { index: 1, count: 3 }],
    ['3/3', { index: 3, count: 3 }],
    ['0/3', null],
    ['4/3', null],
    ['x', null],
    [undefined, null],
  ];
  for (const [input, expected] of cases) assert.deepEqual(parseShard(input), expected);
});

test('retains only usable weights from a JSON object', () => {
  assert.deepEqual(
    [...readWeights('{"a": 1.5, "b": -1, "c": "x", "d": 0}')],
    [['a', 1.5], ['d', 0]],
  );
  assert.equal(readWeights('not json').size, 0);
});

test('runs each runnable UI check once; skipped checks appear only in first shard', () => {
  const discoveredChecks = ['a', 'b', 'c', 'd', 'e', 'f', 'skip-1', 'skip-2'];
  const skippedChecks = new Set(['skip-1', 'skip-2', 'not-found']);
  const shardResults = [1, 2, 3].map(shardIndex => shardChecks(discoveredChecks, skippedChecks, durationWeights, { index: shardIndex, count: 3 }));
  const ran = shardResults.flat().filter(checkName => !skippedChecks.has(checkName));
  assert.deepEqual(ran.sort(), ['a', 'b', 'c', 'd', 'e', 'f']);
  assert.deepEqual(shardResults[0].filter(checkName => skippedChecks.has(checkName)), ['skip-1', 'skip-2']);
  assert.equal(shardResults.slice(1).flat().some(checkName => skippedChecks.has(checkName)), false);
  assert.deepEqual(shardChecks(discoveredChecks, skippedChecks, durationWeights, null), discoveredChecks);
});
