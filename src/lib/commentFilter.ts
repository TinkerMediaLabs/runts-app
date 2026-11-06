// The comment filter lives with the server function that enforces it (amplify/functions/comment-write), so the
// device and the server always use the same rules. This file keeps the old import path working.
export * from '../../amplify/functions/comment-write/commentFilter';
