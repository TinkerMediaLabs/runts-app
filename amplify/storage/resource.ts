import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'runtsStorage',
  access: (allow) => ({
    'profile-pictures/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.authenticated.to(['read']),
    ],
    'stories/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
    'authors/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});