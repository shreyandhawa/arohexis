import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { StorageError } from './StorageError';

function findClick(node: ReactNode): (() => void) | undefined {
  if (!isValidElement(node)) return undefined;
  const props = (node as ReactElement<{ onClick?: () => void; children?: ReactNode }>).props;
  if (props.onClick) return props.onClick;
  for (const child of [props.children].flat()) {
    const found = findClick(child);
    if (found) return found;
  }
  return undefined;
}

describe('StorageError', () => {
  it('offers a retry that re-attempts the open', () => {
    const onRetry = vi.fn();
    const click = findClick(StorageError({ onRetry }));
    expect(click).toBeDefined();
    click?.();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
