import { verifyPass } from './pass';

// Receives the player library's progress posts while a story plays from the car with the app closed.
// Saves the position, or marks the story finished when it is within 25 seconds of the end, the same
// end-of-story steps the phone performs. Pure logic with injected storage so it can be tested.

export const FINISH_WITHIN_SECONDS = 25;
const MEDIA_ID = /^(continue|playlist):([A-Za-z0-9_-]{1,64})$/;

export type ProgressDeps = {
  secret: string;
  now: () => number;
  saveProgress: (a: { userId: string; owner: string; storyId: string; position: number }) => Promise<void>;
  finish: (a: { userId: string; owner: string; storyId: string }) => Promise<void>;
};

export async function handleProgress(
  input: { authorization?: string; body?: string },
  deps: ProgressDeps,
): Promise<{ status: number }> {
  const token = input.authorization?.startsWith('Bearer ') ? input.authorization.slice(7) : undefined;
  const who = verifyPass(token, deps.secret, deps.now());
  if (!who) return { status: 401 };

  let body: any;
  try { body = JSON.parse(input.body ?? ''); } catch { return { status: 400 }; }
  const m = typeof body?.mediaId === 'string' ? MEDIA_ID.exec(body.mediaId) : null;
  if (!m) return { status: 204 };                    // not a car-list story (e.g. started on the phone): ignore
  const position = Number(body.position);
  const duration = Number(body.duration);
  if (!Number.isFinite(position) || position <= 0 || position > 1_000_000) return { status: 204 };

  const base = { userId: who.userId, owner: who.owner, storyId: m[2] };
  if (Number.isFinite(duration) && duration > 0 && position >= duration - FINISH_WITHIN_SECONDS) {
    await deps.finish(base);
  } else {
    await deps.saveProgress({ ...base, position: Math.floor(position) });
  }
  return { status: 204 };
}
