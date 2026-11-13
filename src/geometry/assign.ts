import { hash32 } from '../domain/random';
import { STRANDS_PER_FIBRE, type Field, type RegionKey } from './field';

export type LineRef = {
  id: string;
  kind: 'plan' | 'start';
  partId: string | null;
  order: number;
  /** A plan line whose plan has never been started. */
  waiting: boolean;
};

export type Placement =
  | { kind: 'fibre'; fibre: number }
  | { kind: 'end'; fibre: number; strand: number }
  | { kind: 'none' };

/** One pool of fibres (a region's plan fibres, or its start fibres) and the state of its ends. */
type Pool = {
  fibres: readonly number[];
  taken: Set<number>;
  /** Fibres in the order start lines claimed them, for overflow. */
  claimed: number[];
  /** The next unlit end, counted over `claimed` fibres in order, strands 1 and up. */
  spill: number;
};

const byOrderThenId = (a: LineRef, b: LineRef): number =>
  a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Maps each line to light. Lines settle in a fixed order (non-waiting lines first, by `order` then
 * `id`, then waiting lines), so appending later lines never moves earlier ones.
 */
export function assignFibres(
  lines: readonly LineRef[],
  field: Field,
  regionOfPart: (partId: string | null) => RegionKey,
): ReadonlyMap<string, Placement> {
  const pools = new Map<string, Pool>();
  const poolFor = (region: RegionKey, forPlans: boolean): Pool => {
    const key = `${region}:${forPlans}`;
    let pool = pools.get(key);
    if (!pool) {
      pool = {
        fibres: field.byRegion[region].filter((i) => field.fibres[i]!.forPlans === forPlans),
        taken: new Set(),
        claimed: [],
        spill: 0,
      };
      pools.set(key, pool);
    }
    return pool;
  };

  const sorted = [...lines.filter((l) => !l.waiting).sort(byOrderThenId)].concat(
    lines.filter((l) => l.waiting).sort(byOrderThenId),
  );
  const placements = new Map<string, Placement>();

  for (const line of sorted) {
    const region = regionOfPart(line.partId);
    const pool = poolFor(region, line.kind === 'plan');
    const free = pool.fibres.length - pool.taken.size;
    if (free > 0) {
      let at = hash32(line.id) % pool.fibres.length;
      while (pool.taken.has(pool.fibres[at]!)) at = (at + 1) % pool.fibres.length;
      const fibre = pool.fibres[at]!;
      pool.taken.add(fibre);
      pool.claimed.push(fibre);
      placements.set(line.id, { kind: 'fibre', fibre });
    } else if (
      line.kind === 'start' &&
      pool.spill < pool.claimed.length * (STRANDS_PER_FIBRE - 1)
    ) {
      const per = STRANDS_PER_FIBRE - 1;
      const fibre = pool.claimed[Math.floor(pool.spill / per)]!;
      placements.set(line.id, { kind: 'end', fibre, strand: 1 + (pool.spill % per) });
      pool.spill += 1;
    } else {
      placements.set(line.id, { kind: 'none' });
    }
  }
  return placements;
}
