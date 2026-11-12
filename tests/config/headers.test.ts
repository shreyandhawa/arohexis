import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseHeaders } from '../../config/parseHeaders.ts';

const CSP =
  "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";

const rules = parseHeaders(readFileSync('public/_headers', 'utf8'));

describe('parseHeaders', () => {
  it('maps unindented paths to their indented headers', () => {
    const parsed = parseHeaders('# note\n/a\n  X-One: 1\n  X-Two: a: b\n\n/b/*\n  X-Three: 3\n');
    expect(parsed).toEqual({
      '/a': { 'X-One': '1', 'X-Two': 'a: b' },
      '/b/*': { 'X-Three': '3' },
    });
  });
});

describe('public/_headers', () => {
  it('sends the exact CSP and hardening headers on every path', () => {
    const all = rules['/*'];
    expect(all?.['Content-Security-Policy']).toBe(CSP);
    expect(all?.['Referrer-Policy']).toBe('no-referrer');
    expect(all?.['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
    expect(all?.['X-Content-Type-Options']).toBe('nosniff');
  });

  it.each(['/', '/index.html', '/sw.js', '/manifest.webmanifest'])('revalidates %s', (path) => {
    expect(rules[path]?.['Cache-Control']).toBe('no-cache');
  });

  it('caches hashed assets as immutable', () => {
    expect(rules['/assets/*']?.['Cache-Control']).toBe('public, max-age=31536000, immutable');
  });
});
