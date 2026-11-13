import { describe, expect, it, vi } from 'vitest';
import type { RenderState } from '../brain/brain';
import { PlateBoundary } from './PlateBoundary';
import { loadRenderer } from './guarded';

const update = vi.fn();
const turn = vi.fn();
const destroy = vi.fn();
const create = vi.fn();

vi.mock('../brain/brain', () => ({
  createRenderer: (...args: unknown[]) => create(...args),
}));

const opts = { variant: 'plate', now: () => 0, onPartTap: () => undefined } as const;
const canvas = {} as HTMLCanvasElement;
const state = {} as RenderState;

describe('loadRenderer', () => {
  it('stops calling a renderer whose update throws, and destroys it once', async () => {
    update.mockReset().mockImplementation(() => {
      throw new Error('boom');
    });
    destroy.mockReset();
    turn.mockReset();
    create.mockReset().mockReturnValue({ update, turn, zoom: vi.fn(), destroy });
    const renderer = await loadRenderer(canvas, opts);
    expect(renderer).toBeDefined();
    expect(() => renderer?.update(state)).not.toThrow();
    renderer?.update(state);
    renderer?.turn(1);
    renderer?.destroy();
    expect(update).toHaveBeenCalledTimes(1);
    expect(turn).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('survives a destroy that throws', async () => {
    destroy.mockReset().mockImplementation(() => {
      throw new Error('boom');
    });
    update.mockReset().mockImplementation(() => {
      throw new Error('boom');
    });
    create.mockReset().mockReturnValue({ update, turn, zoom: vi.fn(), destroy });
    const renderer = await loadRenderer(canvas, opts);
    expect(() => renderer?.update(state)).not.toThrow();
  });

  it('passes calls through while the renderer works', async () => {
    update.mockReset();
    turn.mockReset();
    create.mockReset().mockReturnValue({ update, turn, zoom: vi.fn(), destroy });
    const renderer = await loadRenderer(canvas, opts);
    renderer?.update(state);
    renderer?.turn(-1);
    expect(update).toHaveBeenCalledWith(state);
    expect(turn).toHaveBeenCalledWith(-1);
  });

  it('gives undefined when createRenderer throws', async () => {
    create.mockReset().mockImplementation(() => {
      throw new Error('renderer not built');
    });
    await expect(loadRenderer(canvas, opts)).resolves.toBeUndefined();
  });
});

describe('PlateBoundary', () => {
  it('renders its children, then nothing after an error', () => {
    const boundary = new PlateBoundary({ children: 'plate' });
    expect(boundary.render()).toBe('plate');
    boundary.state = PlateBoundary.getDerivedStateFromError();
    expect(boundary.render()).toBeNull();
  });
});
