/* global localStorage, document */
try {
  const t = localStorage.getItem('arohexis:theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch {
  /* storage unavailable: the system theme applies */
}
