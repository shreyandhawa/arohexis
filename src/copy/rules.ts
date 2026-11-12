export const BANNED_WORDS: readonly string[] = [
  'streak',
  'fail',
  'failed',
  'failure',
  'lazy',
  'missed',
  'miss',
  'broke',
  'broken',
  'behind',
  'wasted',
  'should have',
  'must',
  'hurry',
  'rewire',
  'rewires',
  'rewired',
  'rewiring',
  'neural',
  'neuron',
  'neurons',
  'synapse',
  'synapses',
  'plasticity',
  'neuroplasticity',
  'fire',
  'fired',
  'firing',
];

export function wordCount(text: string): number {
  const t = text.trim();
  return t === '' ? 0 : t.split(/\s+/).length;
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Human-readable violations; [] when the text is clean. */
export function checkCopy(text: string): string[] {
  const out: string[] = [];
  for (const word of BANNED_WORDS) {
    const re = new RegExp(`\\b${escapeRe(word).replace(/ /g, '\\s+')}\\b`, 'i');
    if (re.test(text)) out.push(`banned word "${word}"`);
  }
  if (text.includes('!')) out.push('exclamation mark');
  return out;
}
