import { describe, expect, it } from 'vitest';
import { buildField } from '../../geometry/field';
import { buildRig, facing, hitTest, type Item, type Scene } from './draw';

describe('facing', () => {
  it('turns a point on the front to face the viewer, by the shortest way', () => {
    const c = facing([0, -0.17, 1], { yaw: 0.2, pitch: 0, zoom: 2 });
    expect(c.yaw).toBeCloseTo(0);
    expect(c.zoom).toBe(2);
    const far = facing([0, -0.17, 1], { yaw: 6.4, pitch: 0, zoom: 1 });
    expect(far.yaw).toBeCloseTo(2 * Math.PI);
  });
});

describe('hitTest', () => {
  const field = buildField();
  const rig = buildRig(field);
  const view = { w: 300, h: 300, cam: { yaw: -Math.PI / 2, pitch: 0, zoom: 1 } };
  const item = (partId: string | null, kind: Item['kind']): Item => ({
    id: `${partId}`,
    partId,
    kind,
    strength: 0,
    css: '#fff',
    fibre: 0,
    strand: -1,
  });

  it('never matches a core spark, and gives nothing for an empty tap', () => {
    const scene: Scene = { items: [item(null, 'spark')], signals: false };
    for (let x = 0; x < 300; x += 50)
      for (let y = 0; y < 300; y += 50)
        expect(hitTest(scene, field, rig, view, x, y, 400)).toBeUndefined();
  });

  it('matches a part line within the radius', () => {
    const scene: Scene = { items: [item('work', 'start')], signals: false };
    expect(hitTest(scene, field, rig, view, 150, 150, 400)).toEqual({ partId: 'work' });
    expect(hitTest(scene, field, rig, view, -500, -500, 24)).toBeUndefined();
  });
});
