import { preSignUp } from '../triggers';
import { makeDeps } from '../wiring';
export const handler = async (event: any) => preSignUp(event, makeDeps());
