// The sound lines a viewer was sent, each read as its kind and the kind's
// own fields ({ opus_live: { handle, generation, … } }), as the tests read
// them: protocol 2 writes a sound's kind as a field beside the others.

import type { Harness, Sent } from "neoteletext-server-ts-protocol/testing";

/** The sound lines for `session`'s connection, each as `{ [kind]: its fields }`. */
export function soundsOf(harness: Harness, session: number): Sent[] {
  return harness.sounds(session).map((message) => {
    const { kind, type: _type, connections: _connections, ...fields } = message;
    return { [String(kind)]: fields };
  });
}
