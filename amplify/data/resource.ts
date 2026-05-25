import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  User: a
    .model({
      id: a.id().required(),
      type: a.string(),
      name: a.string(),
      profilePicUri: a.string(),
      birthdate: a.date(),
      isPublisher: a.boolean(),
      plan: a.string(),
      onboardingComplete: a.boolean(),
    })
    .authorization(allow => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});