import { createChallenge } from '../triggers';
export const handler = async (event: any) => createChallenge(event);
