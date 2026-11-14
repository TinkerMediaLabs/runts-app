import type { Tip } from './tips';

// Whether a tip may show right now. A pure function so it can be tested: the overlay calls it with the LIVE
// route and store state at the moment of showing (never values captured when a wait began).
export type TipContext = {
  seen:      string[];
  route:     string | null | undefined;
  flags:     Record<string, boolean>;
  hasTarget: boolean;          // the control is registered, i.e. its screen is mounted AND focused
};

export function tipIsEligible(tip: Tip, ctx: TipContext): boolean {
  if (ctx.seen.includes(tip.id)) return false;
  if (!ctx.route || !tip.routes.includes(ctx.route)) return false;
  if (tip.needs && !ctx.flags[tip.needs]) return false;
  return ctx.hasTarget;
}
