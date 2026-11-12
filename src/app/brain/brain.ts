// Stub for M2 Task 7: the lazy Brain space entry. 7A replaces this file with the
// renderer; until then createRenderer throws, so the plate shows its fallback.
import type { BrainSpace } from '../../domain/brainSpace';
import type { Part } from '../../domain/config';

export type RenderState = {
  space: BrainSpace;
  parts: readonly Part[];
  selected: string | null;
  still: boolean;
  reveal?: { lineId: string; startAt: number };
  burstAt?: number;
};

export interface BrainRenderer {
  update(state: RenderState): void;
  turn(step: -1 | 1): void;
  zoom(step: -1 | 1): void;
  destroy(): void;
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  opts: {
    variant: 'plate' | 'strip';
    now: () => number;
    onPartTap: (partId: string | null) => void;
  },
): BrainRenderer {
  void canvas;
  void opts;
  throw new Error('renderer not built');
}
