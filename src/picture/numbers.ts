// The numbers of a mount's interactive components on a picture page
// (renderer parity PAR-42): each component a number of its own, given when
// it is first drawn and kept while it is mounted, so that a render redraws
// only the drawings or objects whose components changed and the page's rule
// table names the same ones. A ReGIS component takes three drawing numbers
// in a row, its own and those of its hover and pressed looks
// (regis-v2.md, "Viewer state"); NAPLPS takes the first as its object's.
// Drawing 1 is the cursor (CURSOR_NUMBER). A number freed by a component
// that unmounts is given again.

import { regisLimits } from "../kit.ts";

/** The drawing or object of the focused text field's caret (`regisCursor`, `naplpsCursor`). */
export const CURSOR_NUMBER = 1;
/** Each component's numbers: its own, then its hover look's and its pressed look's. */
const NUMBERS_PER_COMPONENT = 3;
/** The hover look's and the pressed look's number after the component's own. */
export const HOVER_LOOK_OFFSET = 1;
export const PRESSED_LOOK_OFFSET = 2;
/** The first component's number. */
const FIRST_COMPONENT = CURSOR_NUMBER + 1;

export class PictureNumbers<Key extends object> {
  readonly #numbers = new Map<Key, number>();
  readonly #free: number[] = [];
  #next = FIRST_COMPONENT;

  /** `key`'s number, given now if it has none; 0 when every number is taken. */
  of(key: Key): number {
    const known = this.#numbers.get(key);
    if (known !== undefined) {
      return known;
    }
    let number = this.#free.pop();
    if (number === undefined) {
      if (this.#next + NUMBERS_PER_COMPONENT - 1 > regisLimits.MAX_DRAWING_NUMBER) {
        return 0;
      }
      number = this.#next;
      this.#next += NUMBERS_PER_COMPONENT;
    }
    this.#numbers.set(key, number);
    return number;
  }

  /** `key` unmounted: its number may be given again. */
  forget(key: Key): void {
    const number = this.#numbers.get(key);
    if (number !== undefined) {
      this.#numbers.delete(key);
      this.#free.push(number);
    }
  }
}
