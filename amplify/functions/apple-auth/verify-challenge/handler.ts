import { verifyChallenge } from '../triggers';
import { makeDeps } from '../wiring';
export const handler = async (event: any) => verifyChallenge(event, makeDeps());
