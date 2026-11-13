import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Line } from './Line';

describe('Line ticks', () => {
  it('draws axis ticks as HTML text, not scaled SVG text', () => {
    const html = renderToStaticMarkup(
      createElement(Line, { points: [{ key: 'w1', value: 4 }], summary: 's' }),
    );
    expect(html).not.toContain('<text');
    expect(html.match(/<span[^>]*aria-hidden/g)).toHaveLength(3);
  });
});
