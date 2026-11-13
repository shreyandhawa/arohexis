import { describe, expect, it } from 'vitest';
import { BRAIN_CENTRE, EXPLODE_FROM_ZOOM, TURN_STEP_RAD, ZOOM_MAX, ZOOM_MIN } from './constants';
import {
  STRIP_FIT_MAX,
  STRIP_FILL,
  boxCentre,
  easeStandard,
  explodeAmount,
  stripFit,
  turnBy,
  zoomBy,
  type Camera,
} from './camera';

const start: Camera = { yaw: 0, pitch: 0, zoom: 1, look: BRAIN_CENTRE };

describe('camera', () => {
  it('turn steps by TURN_STEP_RAD', () => {
    expect(turnBy(start, 1).yaw).toBeCloseTo(TURN_STEP_RAD);
    expect(turnBy(start, -1).yaw).toBeCloseTo(-TURN_STEP_RAD);
    expect(turnBy(start, 1).zoom).toBe(1);
  });

  it('zoom steps by 1.25', () => {
    expect(zoomBy(start, 1).zoom).toBeCloseTo(1.25);
    expect(zoomBy(start, -1).zoom).toBeCloseTo(0.8);
  });

  it('zoom stays within ZOOM_MIN and ZOOM_MAX after 20 taps either way', () => {
    let c = start;
    for (let i = 0; i < 20; i++) {
      c = zoomBy(c, 1);
      expect(c.zoom).toBeLessThanOrEqual(ZOOM_MAX);
    }
    expect(c.zoom).toBe(ZOOM_MAX);
    for (let i = 0; i < 40; i++) {
      c = zoomBy(c, -1);
      expect(c.zoom).toBeGreaterThanOrEqual(ZOOM_MIN);
    }
    expect(c.zoom).toBe(ZOOM_MIN);
  });

  it('explodeAmount is 0 at EXPLODE_FROM_ZOOM and 1 at ZOOM_MAX', () => {
    expect(explodeAmount(EXPLODE_FROM_ZOOM)).toBe(0);
    expect(explodeAmount(ZOOM_MIN)).toBe(0);
    expect(explodeAmount(ZOOM_MAX)).toBe(1);
    const mid = explodeAmount((EXPLODE_FROM_ZOOM + ZOOM_MAX) / 2);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it('easeStandard runs 0 to 1 and never goes backwards', () => {
    expect(easeStandard(0)).toBe(0);
    expect(easeStandard(1)).toBe(1);
    expect(easeStandard(0.2)).toBeGreaterThan(0.2);
    let last = 0;
    for (let t = 0.05; t <= 1; t += 0.05) {
      const e = easeStandard(t);
      expect(e).toBeGreaterThanOrEqual(last);
      last = e;
    }
  });
});

describe('strip framing', () => {
  it('centres on the box of the drawn points', () => {
    expect(
      boxCentre([
        [0, 0, 0, 2, 4, 6],
        [1, 1, 1],
      ]),
    ).toEqual([1, 2, 3]);
  });

  it('fits the line to the strip height with padding, within 1 and STRIP_FIT_MAX', () => {
    // A tall line, 20 px high at fit 1, in an 80 px strip fills 76% of the height.
    expect(20 * stripFit(375, 80, 10, 20)).toBeCloseTo(STRIP_FILL * 80);
    expect(stripFit(375, 80, 1000, 1000)).toBe(1);
    expect(stripFit(375, 80, 1, 1)).toBe(STRIP_FIT_MAX);
  });
});
