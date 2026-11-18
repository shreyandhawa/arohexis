/* global localStorage, document */
try {
  const t = localStorage.getItem('arohexis:theme');
  // Night sky (ADR-036): dark unless the person chose light or their device's setting.
  if (t !== 'system')
    document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');
} catch {
  document.documentElement.setAttribute('data-theme', 'dark');
}
