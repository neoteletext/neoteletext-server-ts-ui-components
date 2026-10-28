// Whole pages as they are drawn, cell by cell, against their snapshots
// (snapshot.ts): a dialog over a page, a table, and a player of tracks.

import { test } from "node:test";

import { AudioPlayer, Button, DataTable, Dialog, type Element, h, JoinedPanels, Modal, Text, type Track } from "../src/index.ts";
import type { Harness } from "neoteletext-server-ts-protocol/testing";
import { harness, frame, PAGE } from "./components-fixtures.ts";
import { matchesSnapshot } from "./snapshot.ts";

const RATE = 16_000;

function page(name: string, ...body: Element[]): ReturnType<Harness["seen"]>["rows"] {
  const seen = harness([{ page: PAGE, title: "Test", perViewer: true, root: (): Element => frame(name, ...body) }]);
  seen.join(1, PAGE);
  return seen.seen(1, PAGE).rows;
}

test("a dialog over a page", () => {
  const under = h(Button, { label: "under", onPress: () => {} });
  matchesSnapshot(
    "dialog",
    page(
      "Dialog",
      h(
        Modal,
        { dialog: h(Dialog, { title: "Delete it?", message: "It cannot be had back.", buttons: ["Delete", "Keep"], kind: "warning", shadow: true }) },
        under,
      ),
    ),
  );
});

test("a sortable table", () => {
  const columns = [
    { title: "Team", width: 16 },
    { title: "Pts", width: 6, align: "right" as const },
  ];
  matchesSnapshot(
    "table",
    page(
      "Table",
      h(DataTable, {
        columns,
        rows: [
          ["Rovers", "12"],
          ["United", "9"],
          ["City", "15"],
        ],
        shown: 4,
        sortable: true,
      }),
    ),
  );
});

test("a player of tracks before anything plays", () => {
  const silence = new Int16Array(RATE);
  const track = (name: string): Track => ({
    name,
    source: () => ({ name, rate: RATE, samples: () => silence, complete: true, failure: null, expected: silence.length }),
  });
  matchesSnapshot("player", page("Player", h(AudioPlayer, { tracks: [track("Morning"), track("Noon"), track("Night")] })));
});

test("panels side by side, their shared border drawn once", () => {
  matchesSnapshot(
    "joined-panels",
    page("Joined", h(JoinedPanels, { titles: ["News", "Sport"] }, h(Text, { text: "Rain later" }), h(Text, { text: "Rovers win" }))),
  );
});
