import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'runtsStorage',
  access: (allow) => ({
    'profile-pictures/{entity_id}/*': [
      // Owner only: profile photos are private and never shown to other listeners.
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
    // Read-only for signed-in app users. Writes happen only through the admin-only
    // getUploadUrl mutation (functions/upload-url), which the CMS uses.
    // Nothing under stories/ is read directly: covers, scene images and audio all come through the signed CDN links
    // (audio-links function), which refuses premium audio to people without Premium (admins are always allowed).
    'authors/*': [
      allow.authenticated.to(['read']),
    ],
    'narrators/*': [
      allow.authenticated.to(['read']),
    ],
  }),
});