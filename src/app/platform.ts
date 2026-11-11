export interface PlatformEnv {
  userAgent: string;
  maxTouchPoints: number;
  /** Safari's non-standard `navigator.standalone`; undefined elsewhere. */
  standalone: boolean | undefined;
  /** `matchMedia('(display-mode: standalone)').matches` */
  displayModeStandalone: boolean;
}

/**
 * True on iPhone and iPad. iPadOS in desktop mode reports a Mac user agent, so a Mac
 * with touch points counts as an iPad.
 */
export function isIos(env: Pick<PlatformEnv, 'userAgent' | 'maxTouchPoints'>): boolean {
  return (
    /iPhone|iPad|iPod/.test(env.userAgent) ||
    (/Macintosh/.test(env.userAgent) && env.maxTouchPoints > 1)
  );
}

/**
 * True in Safari on iPhone or iPad when the app runs in a browser tab rather than
 * from the Home Screen.
 */
export function isIosSafariNonStandalone(env: PlatformEnv): boolean {
  if (!isIos(env)) return false;
  // Other iOS browsers (Chrome, Firefox, Edge) can also add to the Home Screen,
  // but the note's wording is Safari's, so show it only for Safari.
  if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(env.userAgent)) return false;
  return env.standalone !== true && !env.displayModeStandalone;
}

export function currentPlatformEnv(): PlatformEnv {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    userAgent: nav.userAgent,
    maxTouchPoints: nav.maxTouchPoints,
    standalone: nav.standalone,
    displayModeStandalone: window.matchMedia('(display-mode: standalone)').matches,
  };
}
