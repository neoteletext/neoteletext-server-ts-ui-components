// The step a pair of keys makes in a choice: one key forward, the other
// back, and any other key, or a release, none.

import { isPress, type KeyEvent } from "../core/events.ts";

export function keyStep(event: KeyEvent, forward: string, back: string): -1 | 0 | 1 {
  if (isPress(event, forward)) {
    return 1;
  }
  return isPress(event, back) ? -1 : 0;
}
