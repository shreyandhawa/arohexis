/* global localStorage, document */
try {
  const t = localStorage.getItem('arohexis:theme');
  // Night sky (ADR-036): a stored choice wins; a first visit is dark; an earlier record
  // with no stored mirror (it chose "Match my device" in v1) follows the device.
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else if (t === null && localStorage.getItem('arohexis:welcomed') !== '1')
    document.documentElement.setAttribute('data-theme', 'dark');
} catch {
  document.documentElement.setAttribute('data-theme', 'dark');
}
