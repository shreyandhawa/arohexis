import { describe, expect, it } from 'vitest';
import { isIos, isIosSafariNonStandalone } from './platform';

const iphone =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const android =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const ipadDesktopMode =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

describe('isIosSafariNonStandalone', () => {
  it('is true for iPhone Safari in a tab', () => {
    expect(
      isIosSafariNonStandalone({
        userAgent: iphone,
        maxTouchPoints: 5,
        standalone: false,
        displayModeStandalone: false,
      }),
    ).toBe(true);
  });

  it('is false once installed (navigator.standalone)', () => {
    expect(
      isIosSafariNonStandalone({
        userAgent: iphone,
        maxTouchPoints: 5,
        standalone: true,
        displayModeStandalone: false,
      }),
    ).toBe(false);
  });

  it('is false once installed (display-mode: standalone)', () => {
    expect(
      isIosSafariNonStandalone({
        userAgent: iphone,
        maxTouchPoints: 5,
        standalone: undefined,
        displayModeStandalone: true,
      }),
    ).toBe(false);
  });

  it('is false for Android Chrome', () => {
    expect(
      isIosSafariNonStandalone({
        userAgent: android,
        maxTouchPoints: 5,
        standalone: undefined,
        displayModeStandalone: false,
      }),
    ).toBe(false);
  });

  it('is true for iPad in desktop mode (Mac user agent with touch)', () => {
    expect(
      isIosSafariNonStandalone({
        userAgent: ipadDesktopMode,
        maxTouchPoints: 5,
        standalone: false,
        displayModeStandalone: false,
      }),
    ).toBe(true);
  });

  it('is false for a real Mac without touch', () => {
    expect(
      isIosSafariNonStandalone({
        userAgent: ipadDesktopMode,
        maxTouchPoints: 0,
        standalone: undefined,
        displayModeStandalone: false,
      }),
    ).toBe(false);
  });
});

describe('isIos', () => {
  it('is true for iPhone and for iPad in desktop mode', () => {
    expect(isIos({ userAgent: iphone, maxTouchPoints: 5 })).toBe(true);
    expect(isIos({ userAgent: ipadDesktopMode, maxTouchPoints: 5 })).toBe(true);
  });

  it('is false for Android and for a Mac without touch', () => {
    expect(isIos({ userAgent: android, maxTouchPoints: 5 })).toBe(false);
    expect(isIos({ userAgent: ipadDesktopMode, maxTouchPoints: 0 })).toBe(false);
  });
});
