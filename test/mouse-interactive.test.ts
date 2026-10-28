// The pointer on the library's interactive components: polls, quizzes,
// wizards, games, charts and a choice list's hints.

import assert from "node:assert/strict";
import { test } from "node:test";

import { text } from "neoteletext-server-ts-protocol/testing";
import { Action, type Article, BarChart, ChoiceList, ColumnChart, h, Poll, Quiz, Roulette, Snake, SPIN_STEPS_MS, Tally, Wizard } from "../src/index.ts";
import { PAGE, BODY_ROW, HINT_ROW, viewer, controls, row, controlBy, wait, click } from "./mouse-fixtures.ts";

test("a click on a poll's option votes for it, on every copy, as Enter does", () => {
  const tally = new Tally("best", ["Red", "Green", "Blue"]);
  const page = viewer(h(Poll, { tally }));
  click(page, controlBy(page, "Green"));
  assert.deepEqual(tally.votes, [0, 1, 0]);
  assert.match(row(page, BODY_ROW + 2), />\*Green/u, "chosen, and marked as this viewer's vote");
  click(page, controlBy(page, "Blue"));
  assert.deepEqual(tally.votes, [0, 0, 1], "the vote moved");
});

test("a click on a quiz's answer answers it, as its coloured key does", () => {
  const page = viewer(h(Quiz, { questions: [{ question: "Two and two?", answers: ["three", "four", "five", "six"], right: 1 }] }));
  click(page, controlBy(page, "four"));
  assert.match(
    page
      .seen(1, PAGE)
      .rows.map((codes) => text([codes], 0))
      .join("\n"),
    /score 1 of 1/u,
  );
});

test("a wizard's Next and Back are actions, and a step done is a badge a click goes back to", () => {
  const steps: number[] = [];
  const page = viewer(
    h(
      Wizard,
      {
        steps: ["One", "Two", "Three"],
        onStep: (step: number) => {
          steps.push(step);
        },
      },
      h(Action, { text: "first", onPress: () => {} }),
      h(Action, { text: "second", onPress: () => {} }),
      h(Action, { text: "third", onPress: () => {} }),
    ),
  );
  click(page, controlBy(page, "green Next"));
  click(page, controlBy(page, "green Next"));
  assert.deepEqual(steps, [1, 2]);
  assert.match(
    page
      .seen(1, PAGE)
      .rows.map((codes) => text([codes], 0))
      .join("\n"),
    /green Finish/u,
  );
  const done = controls(page).filter((control) => control.row === BODY_ROW);
  assert.equal(done.length, 2, "the two steps done are controls; the step shown is not");
  const [first] = done;
  assert.ok(first !== undefined);
  click(page, first);
  assert.deepEqual(steps, [1, 2, 0]);
  assert.equal(controls(page).filter((control) => control.row === BODY_ROW).length, 0, "on the first step nothing is done");
  click(page, controlBy(page, "green Next"));
  click(page, controlBy(page, "red Back"));
  assert.deepEqual(steps, [1, 2, 0, 1, 0]);
});

test("a roulette spins on a click on its prompt; while it spins its headline is no link; stopped, the headline goes to its page and the line under it spins again", () => {
  const articles: Article[] = [{ title: "A robot arm", page: 0x201, writer: "Ada", date: Date.UTC(2026, 9, 28), blocks: [], tags: [] }];
  const page = viewer(h(Roulette, { articles }));
  click(page, controlBy(page, "spin the wheel"));
  wait(page, SPIN_STEPS_MS[0]);
  assert.deepEqual(controls(page), [], "spinning: nothing to click");
  wait(
    page,
    SPIN_STEPS_MS.reduce((sum, step) => sum + step, 0),
  );
  const headline = controlBy(page, "A robot arm");
  click(page, headline);
  assert.deepEqual(page.gotos(1), [0x201]);
  click(page, controlBy(page, "spin again"));
  wait(page, SPIN_STEPS_MS[0]);
  assert.match(
    page
      .seen(1, PAGE)
      .rows.map((codes) => text([codes], 0))
      .join("\n"),
    /Spinning/u,
  );
});

test("a click on the field turns the snake toward it; crashed, the line that says so is a control and a click plays again", () => {
  const FRAME_MS = 100;
  const ROWS = 10;
  const page = viewer(h(Snake, { everyMs: FRAME_MS, rows: ROWS }));
  // The head starts at the field's middle row heading right; a click on the top row turns it up, into the top wall within the field's height.
  page.clickLeft(1, 10, BODY_ROW);
  wait(page, FRAME_MS * ROWS * 3);
  const score = BODY_ROW + ROWS;
  assert.match(row(page, score), /crashed/u, "it went up into the wall");
  const again = controlBy(page, "crashed");
  assert.equal(again.row, score);
  click(page, again);
  assert.doesNotMatch(row(page, score), /crashed/u, "playing again");
  wait(page, FRAME_MS * ROWS * 3);
  assert.doesNotMatch(row(page, score), /crashed/u, "heading right it has room for longer");
});

test("a chart whose bars or columns can be chosen makes each a control; a click chooses it, and on one the hint row says what it is", () => {
  const chosen: number[] = [];
  const bars = [
    { label: "Mon", value: 3 },
    { label: "Tue", value: 6 },
  ];
  const barChart = viewer(
    h(BarChart, {
      bars,
      onChoose: (index: number) => {
        chosen.push(index);
      },
    }),
  );
  const tuesday = controlBy(barChart, "Tue");
  click(barChart, tuesday);
  barChart.hover(1, "enter", tuesday.column, tuesday.row);
  assert.match(row(barChart, HINT_ROW), /Tue: 6/u);
  const columnChart = viewer(
    h(ColumnChart, {
      bars,
      plotRows: 3,
      onChoose: (index: number) => {
        chosen.push(index);
      },
    }),
  );
  const [monday] = controls(columnChart);
  assert.ok(monday !== undefined);
  assert.equal(monday.height, 5, "the plot's rows and the labels' two, by turns, since Mon is longer than its column");
  click(columnChart, monday);
  assert.deepEqual(chosen, [1, 0]);
  assert.deepEqual(controls(viewer(h(BarChart, { bars }))), [], "without onChoose, a chart declares nothing");
});

test("a choice list's row says what it is on the hint row while the pointer is on it, and the list's own hint comes back as it leaves", () => {
  const page = viewer(
    // oxlint-disable-next-line typescript/no-unnecessary-type-arguments -- string is the default, but without it h() infers the items as unknown
    h(ChoiceList<string>, { items: ["one", "two"], shown: 2, onChoose: () => {}, itemHint: (item: string) => (item === "two" ? "the second of two" : null) }),
  );
  const one = controlBy(page, "one");
  const two = controlBy(page, "two");
  page.hover(1, "enter", two.column, two.row);
  assert.match(row(page, HINT_ROW), /the second of two/u);
  page.hover(1, "leave", two.column, two.row);
  page.hover(1, "enter", one.column, one.row);
  assert.match(row(page, HINT_ROW), /Up Down, wheel or click/u, "a row with no hint of its own: the list's");
});
