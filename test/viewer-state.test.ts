// What one viewer keeps is keyed by their handle, never by a connection's
// number (viewer-state.md VS-405 to VS-409, TODO-6463): two tabs of one
// viewer share a ballot, a reconnect keeps it, a connection number the
// server gives again after a restart is given nothing, and what a
// connection with no viewer does is kept under the viewer's handle once
// the library has asked for their state and it is granted.

import assert from "node:assert/strict";
import { test } from "node:test";

import { shows } from "neoteletext-server-ts-protocol/testing";
import { SqliteStateStore } from "../src/index.ts";
import { Key } from "../src/kit.ts";
import { channel, COUNTER, FORGET, LANGUAGES, linesOf, marksAVote, POLL } from "./viewer-state-fixtures.ts";

test("TODO-6463, VS-405: a connection number the server gives again after a restart is given no one's ballot or kept state", () => {
  const store = new SqliteStateStore(":memory:");
  const { harness, tally } = channel(store);
  const alice = harness.viewer("alice");
  const tab = harness.join(alice, POLL);
  harness.press(tab, Key.Enter);
  harness.open(tab, COUNTER);
  harness.press(tab, Key.Enter);
  assert.ok(marksAVote(harness, harness.join(alice, POLL)), "alice's vote is hers in another tab");

  harness.restart();
  const bob = harness.viewer("bob");
  const bobTab = harness.join(bob, POLL);
  assert.equal(bobTab, tab, "the server gave bob the number alice's tab had");
  assert.ok(!marksAVote(harness, bobTab), "bob is not shown alice's vote");
  assert.equal(tally.ballotOf({ connection: bobTab, viewer: { handle: bob.handle, remembered: false } }), null);
  harness.open(bobTab, COUNTER);
  assert.ok(shows(harness.seen(bobTab, COUNTER).rows, "count 0"), "nor alice's kept count");
  const anonymous = harness.join(tab + 1, POLL);
  assert.ok(!marksAVote(harness, anonymous), "nor is a connection with no viewer");
  store.close();
});

test("VS-406: alice in two tabs votes in both, interleaved: the poll counts one vote, her last", () => {
  const store = new SqliteStateStore(":memory:");
  const { harness, tally } = channel(store);
  const alice = harness.viewer("alice");
  const first = harness.join(alice, POLL);
  const second = harness.join(alice, POLL);
  harness.press(first, Key.Enter);
  harness.press(second, Key.Down);
  harness.press(second, Key.Enter);
  harness.press(first, Key.Down);
  harness.press(first, Key.Down);
  harness.press(first, Key.Enter);
  assert.deepEqual(tally.votes, [0, 0, 1]);
  assert.equal(tally.ballotOf({ connection: second, viewer: { handle: alice.handle, remembered: false } }), 2);
  harness.close(first);
  harness.close(second);
  const back = harness.join(alice, POLL);
  assert.ok(marksAVote(harness, back), "a reconnect keeps her ballot");
  harness.press(back, Key.Up);
  harness.press(back, Key.Enter);
  assert.deepEqual(tally.votes, [0, 1, 0], "and her vote moves, never cast again");
  store.close();
});

test("VS-407: a vote with no viewer asks for state after the key, and granted, the ballot is the viewer's", () => {
  const store = new SqliteStateStore(":memory:");
  const { harness, tally } = channel(store);
  const tab = harness.join(1, POLL);
  assert.deepEqual(linesOf(harness, "request_state"), [], "nothing is asked before the viewer acts");
  harness.press(tab, Key.Enter);
  assert.deepEqual(
    linesOf(harness, "request_state"),
    [{ type: "request_state", connection: tab }],
    "asked once, though the key's press and release are two inputs",
  );
  assert.deepEqual(tally.votes, [1, 0, 0], "the vote counts at once");
  harness.grantState(tab);
  const viewer = { handle: harness.viewer(`connection ${tab}`).handle, remembered: false };
  assert.equal(store.ofViewer(viewer, "poll:best", 1), 0, "written under the handle");
  const other = harness.join(harness.viewer(`connection ${tab}`), POLL);
  assert.ok(marksAVote(harness, other), "and the viewer's other tab shows it");
  harness.press(other, Key.Enter);
  assert.deepEqual(tally.votes, [1, 0, 0], "one vote");
  store.close();
});

test("VS-407: a vote with no viewer, its state refused, counts for the connection's life and is kept for no viewer", () => {
  const store = new SqliteStateStore(":memory:");
  const { harness, tally } = channel(store);
  const tab = harness.join(1, POLL);
  harness.press(tab, Key.Enter);
  harness.refuseState(tab, "declined");
  harness.press(tab, Key.Down);
  harness.press(tab, Key.Enter);
  assert.deepEqual(tally.votes, [0, 1, 0], "the connection's vote moved");
  assert.equal(linesOf(harness, "request_state").length, 1, "refused, it is not asked again");
  assert.equal(store.viewerValues, 0, "nothing is kept per viewer");
  harness.close(tab);
  assert.deepEqual(tally.votes, [0, 1, 0], "gone, its vote stays counted");
  store.close();
});

test("VS-407: a viewer who voted before votes again with no viewer, then is granted: one vote, the last", () => {
  const store = new SqliteStateStore(":memory:");
  const { harness, tally } = channel(store);
  const alice = harness.viewer("alice");
  harness.press(harness.join(alice, POLL), Key.Enter);
  const fresh = harness.join(9, POLL);
  harness.press(fresh, Key.Down);
  harness.press(fresh, Key.Enter);
  assert.deepEqual(tally.votes, [1, 1, 0]);
  harness.channel.viewerBegan(fresh, alice.handle, false);
  assert.deepEqual(tally.votes, [0, 1, 0], "her vote of before is taken back for this one");
  store.close();
});

test("VS-407: a kept component changed with no viewer is written under the handle when the viewer begins", () => {
  const store = new SqliteStateStore(":memory:");
  const { harness } = channel(store);
  const tab = harness.join(1, COUNTER);
  harness.press(tab, Key.Enter);
  assert.equal(linesOf(harness, "request_state").length, 1);
  assert.equal(store.viewerValues, 0, "held in the component until then");
  harness.grantState(tab);
  const viewer = harness.viewer(`connection ${tab}`);
  assert.deepEqual(store.ofViewer({ handle: viewer.handle, remembered: false }, "component:counter", 1), { count: 1 });
  const other = harness.join(viewer, COUNTER);
  assert.ok(shows(harness.seen(other, COUNTER).rows, "count 1"), "the viewer's other tab has it");
  store.close();
});

test("VS-408: a viewer's language is kept under their handle, drawn in their other tabs at once and read when they come back", () => {
  const store = new SqliteStateStore(":memory:");
  const { harness } = channel(store);
  const alice = harness.viewer("alice");
  const first = harness.join(alice, LANGUAGES);
  const second = harness.join(alice, COUNTER);
  const bob = harness.join(harness.viewer("bob"), COUNTER);
  harness.press(first, Key.Down);
  harness.press(first, Key.Enter);
  assert.equal(harness.channel.copy(second, COUNTER)?.at(-1)?.content.language, "ru", "her other tab is drawn in it at once");
  assert.notEqual(harness.channel.copy(bob, COUNTER)?.at(-1)?.content.language, "ru", "bob's is not");
  assert.equal(store.ofViewer({ handle: alice.handle, remembered: false }, "language", 1), "ru");
  harness.restart();
  const back = harness.join(alice, COUNTER);
  assert.equal(harness.channel.copy(back, COUNTER)?.at(-1)?.content.language, "ru", "read from the store as she connects");
  assert.equal(linesOf(harness, "cookie").length, 0, "no cookie");
  store.close();
});

test("VS-408: a connection with no viewer keeps its language for itself, and asks for state", () => {
  const store = new SqliteStateStore(":memory:");
  const { harness } = channel(store);
  const tab = harness.join(1, LANGUAGES);
  harness.press(tab, Key.Down);
  harness.press(tab, Key.Enter);
  assert.equal(harness.channel.copy(tab, LANGUAGES)?.at(-1)?.content.language, "ru");
  assert.equal(linesOf(harness, "request_state").length, 1);
  harness.grantState(tab);
  assert.equal(store.ofViewer({ handle: harness.viewer(`connection ${tab}`).handle, remembered: false }, "language", 1), "ru", "kept once the viewer begins");
  store.close();
});

test("VS-409: forgetting a viewer ends their state and deletes what is kept for them; a reset deletes every viewer's", () => {
  const store = new SqliteStateStore(":memory:");
  const { harness, tally } = channel(store);
  const alice = harness.viewer("alice");
  const tab = harness.join(alice, POLL);
  harness.press(tab, Key.Enter);
  harness.press(harness.join(harness.viewer("bob"), POLL), Key.Enter);
  harness.open(tab, FORGET);
  harness.press(tab, Key.Enter);
  assert.deepEqual(linesOf(harness, "end_state"), [{ type: "end_state", viewer: alice.handle }]);
  assert.equal(store.ofViewer({ handle: alice.handle, remembered: false }, "poll:best", 1), undefined, "her ballot is gone");
  assert.deepEqual(tally.votes, [2, 0, 0], "the count, which is no one's, stays");
  assert.equal(store.viewerValues, 1, "bob's is kept");
  harness.channel.viewersReset();
  assert.equal(store.viewerValues, 0, "a reset deletes every viewer's");
  store.close();
});
