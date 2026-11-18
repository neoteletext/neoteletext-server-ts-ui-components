// The sound lines a viewer was sent, each read as its kind and the kind's
// own fields ({ opus_live: { handle, generation, … } }), as the tests read
// them: the kit gives back each member as the program built it.

import type { Harness, Sent } from "neoteletext-server-ts-protocol/testing";

/** The sound lines for `connection`, each as `{ [kind]: its fields }`. */
export function soundsOf(harness: Harness, connection: number): Sent[] {
  return harness.sounds(connection).map((message) => {
    const { kind, ...fields } = message;
    return { [kind]: fields };
  });
}
