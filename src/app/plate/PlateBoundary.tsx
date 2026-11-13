import { Component, type ReactNode } from 'react';

type State = { failed: boolean };

/**
 * The plate is optional. If it throws while rendering, it disappears and the rest of Home,
 * the stuck button included, keeps working (spec §16.10, ADR-033).
 */
export class PlateBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
