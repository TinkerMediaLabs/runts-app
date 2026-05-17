/**
 * Module-level player control ref.
 * TrackPlayerWidget registers collapsePlayer on mount.
 * Any component can import and call collapsePlayer() directly —
 * no context or prop drilling needed.
 */

let _collapsePlayer: (() => void) | null = null;
let _expandPlayer: (() => void) | null = null;

export function registerPlayerControls(
  collapse: () => void,
  expand: () => void
) {
  _collapsePlayer = collapse;
  _expandPlayer = expand;
}

export function collapsePlayer() {
  _collapsePlayer?.();
}

export function expandPlayer() {
  _expandPlayer?.();
}