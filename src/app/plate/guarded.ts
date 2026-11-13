import type { BrainRenderer, RenderState } from '../brain/brain';

export type RendererOptions = {
  variant: 'plate' | 'strip';
  now: () => number;
  onPartTap: (partId: string | null) => void;
};

/** A renderer that can't throw into React: after its first throw it is destroyed and ignored. */
export type GuardedRenderer = {
  update(state: RenderState): void;
  turn(step: -1 | 1): void;
  zoom(step: -1 | 1): void;
  destroy(): void;
};

function guard(renderer: BrainRenderer): GuardedRenderer {
  let live: BrainRenderer | null = renderer;
  function drop(): void {
    const dead = live;
    live = null;
    try {
      dead?.destroy();
    } catch {
      // already broken
    }
  }
  function run(call: (r: BrainRenderer) => void): void {
    if (!live) return;
    try {
      call(live);
    } catch {
      drop();
    }
  }
  return {
    update: (state) => run((r) => r.update(state)),
    turn: (step) => run((r) => r.turn(step)),
    zoom: (step) => run((r) => r.zoom(step)),
    destroy: drop,
  };
}

/** Loads the renderer chunk. A failed import or a throwing `createRenderer` gives undefined. */
export async function loadRenderer(
  canvas: HTMLCanvasElement,
  options: RendererOptions,
): Promise<GuardedRenderer | undefined> {
  try {
    const { createRenderer } = await import('../brain/brain');
    return guard(createRenderer(canvas, options));
  } catch {
    return undefined;
  }
}
