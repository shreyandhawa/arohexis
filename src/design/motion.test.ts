import { describe, expect, it } from 'vitest';
import buttonCss from '../app/components/Button.module.css?raw';
import startedCss from '../app/screens/Started.module.css?raw';

describe('ADR-018 motion', () => {
  it('presses buttons the same way as chips and feelings', () => {
    expect(buttonCss).toMatch(/\.button:active:not\(:disabled\)\s*{\s*transform:\s*scale\(0\.97\)/);
    expect(buttonCss).toMatch(/transition:[^;]*transform var\(--motion-quick\)/);
  });

  it('applies quiet hover only where hover exists', () => {
    const hover = buttonCss.indexOf('.quiet:hover');
    const media = buttonCss.indexOf('@media (hover: hover)');
    expect(media).toBeGreaterThanOrEqual(0);
    expect(hover).toBeGreaterThan(media);
    expect(buttonCss.slice(0, media)).not.toContain('.quiet:hover');
  });

  it('settles the reward down from above', () => {
    const from = startedCss.slice(startedCss.indexOf('@keyframes settle'));
    expect(from).toMatch(/from\s*{[^}]*translateY\(-6px\)/);
  });
});
