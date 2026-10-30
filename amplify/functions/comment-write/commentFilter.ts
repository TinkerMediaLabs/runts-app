// Shared by the app (src/lib/commentFilter.ts re-exports this file) and the comment-write function, so the
// same rules run on the device and on the server.
// A basic filter for comments, required by Apple (guideline 1.2: "a method for filtering objectionable material").
// It blocks slurs, strong profanity and direct harassment, not mild language. It is deliberately simple and
// runs on the device, with reports and blocking as the backstop. Extend the lists below as moderators see new patterns.

// Matched as whole words (a few common endings allowed), ignoring repeated letters, case, accents and
// look-alike characters (@ for a, 0 for o, $ for s, ...).
const BLOCKED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dickhead', 'wanker', 'twat', 'slut', 'whore',
  'retard', 'faggot', 'fag', 'nigger', 'nigga', 'tranny', 'kike', 'spic', 'chink', 'wetback',
];

// Direct harassment, matched as phrases.
const BLOCKED_PHRASES = ['kill yourself', 'kys', 'go die', 'hope you die', 'i will kill you', 'ill kill you'];

const LOOKALIKES: Record<string, string> = { '@': 'a', '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '$': 's', '7': 't' };

export function normalizeForFilter(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/([a-z])!([a-z])/g, '$1i$2')   // b!tch, but not the "!" ending a sentence
    .replace(/[@01345$7]/g, c => LOOKALIKES[c] ?? c)
    .replace(/[^a-z\s]/g, ' ')
    .replace(/(.)\1+/g, '$1')      // "fuuuck" -> "fuck"
    .replace(/\s+/g, ' ')
    .trim();
}

const squash = (w: string) => w.replace(/(.)\1+/g, '$1');
const wordPattern = new RegExp(`(^| )(${BLOCKED_WORDS.map(squash).join('|')})(s|ed|er|ers|ing|in)?( |$)`);
const phrasePattern = new RegExp(`(^| )(${BLOCKED_PHRASES.map(p => squash(normalizeForFilter(p))).join('|')})( |$)`);

// True when the text is acceptable.
export function isCommentAllowed(text: string): boolean {
  const n = normalizeForFilter(text);
  if (!n) return true;
  return !wordPattern.test(n) && !phrasePattern.test(n);
}

export const COMMENT_REJECTED_MESSAGE =
  "Your comment includes language that isn't allowed. Please reword it and try again.";

export const COMMENT_MAX_LENGTH = 500;

export const COMMENT_RATE_LIMIT_MESSAGE = "You're posting too quickly. Please wait a minute and try again.";
