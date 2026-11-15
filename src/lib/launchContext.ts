// Set when this launch came from a shared link or a notification tap. The daily mood sheet stays away then, so
// it never covers the story the person was sent to.
let fromOutside = false;
export const markOpenedFromOutside = () => { fromOutside = true; };
export const wasOpenedFromOutside = () => fromOutside;
