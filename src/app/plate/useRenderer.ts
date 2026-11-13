import { useEffect, useRef, useState, type RefObject } from 'react';
import type { RenderState } from '../brain/brain';
import { loadRenderer, type GuardedRenderer, type RendererOptions } from './guarded';

/**
 * Loads the renderer after the first paint, so it never delays the stuck button. If the chunk or
 * the renderer fails, now or later, the plate keeps its text and nothing retries (spec §16.10).
 */
export function useRenderer(
  canvas: RefObject<HTMLCanvasElement | null>,
  options: RendererOptions,
  state: RenderState | undefined,
): { turn(step: -1 | 1): void; zoom(step: -1 | 1): void } {
  const renderer = useRef<GuardedRenderer | null>(null);
  const latest = useRef(options);
  const [ready, setReady] = useState(false);
  const { variant } = options;

  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() => {
        void load();
      }, 0);
    });

    async function load() {
      const element = canvas.current;
      if (!element) return;
      const loaded = await loadRenderer(element, {
        variant,
        now: () => latest.current.now(),
        onPartTap: (partId) => latest.current.onPartTap(partId),
      });
      if (cancelled) {
        loaded?.destroy();
        return;
      }
      if (loaded) {
        renderer.current = loaded;
        setReady(true);
      }
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      renderer.current?.destroy();
      renderer.current = null;
      setReady(false);
    };
  }, [canvas, variant]);

  useEffect(() => {
    if (ready && state) renderer.current?.update(state);
  }, [ready, state]);

  return {
    turn: (step) => renderer.current?.turn(step),
    zoom: (step) => renderer.current?.zoom(step),
  };
}
