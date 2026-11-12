export function fallbackWeight(durationWeights: ReadonlyMap<string, number>): number;
export function byWeight(itemNames: readonly string[], durationWeights: ReadonlyMap<string, number>): string[];
export function planShards(itemNames: readonly string[], durationWeights: ReadonlyMap<string, number>, shardCount: number): Map<string, number>;
export interface ShardSelection {
  /** One-based index from the external index/count notation. */
  index: number;
  /** Total number of shards. */
  count: number;
}
export function shardChecks(discoveredChecks: readonly string[], skippedChecks: ReadonlySet<string>, durationWeights: ReadonlyMap<string, number>, shardSelection: ShardSelection | null): string[];
export function parseShard(shardSpec: string | undefined | null): ShardSelection | null;
export function readWeights(weightsJson: string): Map<string, number>;
