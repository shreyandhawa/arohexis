export type HeaderRules = Record<string, Record<string, string>>;

/**
 * Parses the Cloudflare `_headers` format: an unindented path line, then indented
 * `Name: value` lines. Blank lines and `#` comments are ignored. Shared by the
 * preview server and the config tests so the headers are defined in one place.
 */
export function parseHeaders(text: string): HeaderRules {
  const rules: HeaderRules = {};
  let current: Record<string, string> | undefined;
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '' || raw.trimStart().startsWith('#')) continue;
    if (/^\s/.test(raw)) {
      const colon = raw.indexOf(':');
      if (current && colon > 0) current[raw.slice(0, colon).trim()] = raw.slice(colon + 1).trim();
    } else {
      current = rules[raw.trim()] ?? {};
      rules[raw.trim()] = current;
    }
  }
  return rules;
}
