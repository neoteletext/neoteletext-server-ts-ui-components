// The sound lines a viewer was sent, each read as its kind and the kind's
// own fields ({ opus_live: { handle, generation, … } }), as the tests read
// them: protocol 3 writes a sound's kind as a field beside the others.

import type { Harness, Sent } from "neoteletext-server-ts-protocol/testing";

/** The sound lines for `connection`'s connection, each as `{ [kind]: its fields }`. */
export function soundsOf(harness: Harness, connection: number): Sent[] {
  return harness.sounds(connection).map((message) => {
    const { kind, type: _type, connections: _connections, ...fields } = message;
    return { [String(kind)]: fields };
  });
}
