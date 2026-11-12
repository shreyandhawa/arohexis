const TEXT_ENTRY = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

/** True when a key event came from a field where the person is typing, so shortcuts must stand down. */
export function isTyping(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TEXT_ENTRY) !== null;
}
