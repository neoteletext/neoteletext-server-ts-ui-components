// REQ-1723 item 4: `h` takes a component class and nothing else. The type
// check reads this file: if `h` ever accepts a function, the comment below is
// an unused expectation, and `tsc` fails.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Component, h, Rows } from "../src/index.ts";

class Shown extends Component {
  override render(): null {
    return null;
  }
}

/** What a function component would be. */
function plain(): null {
  return null;
}

/** Never called: the type check is what refuses it. */
function refused(): ReturnType<typeof h> {
  // @ts-expect-error -- REQ-1723 item 4: a function is not a component class, whatever it returns.
  return h(plain, {});
}

test("a plain function that builds an element from a class is not a component", () => {
  // REQ-1723 item 6: this is allowed, and is not a function component.
  const build = (): ReturnType<typeof h> => h(Shown, {});
  assert.equal(build().type, Shown);
  assert.equal(h(Rows, {}).type, Rows);
  assert.equal(typeof refused, "function");
});
