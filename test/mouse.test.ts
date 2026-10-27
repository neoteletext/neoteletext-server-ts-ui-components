// The pointer in every component that has a use for it (controls.ts and
// INPUT.md sections 5.4, 7.3 and 7.4): what each declares as a control, so
// the browser lights it in the page's rollover colours, what a click there
// does, what a hover tells a list's user, and what the wheel turns. Each
// control is found from what the page declares, as the browser reads it,
// never from where a test supposes it is drawn.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Harness, text } from "neottx-server-ts-protocol/testing";
import {
  Action,
  type Article,
  Badges,
  BarChart,
  type Box,
  Breadcrumbs,
  Button,
  type Child,
  ChoiceList,
  ColumnChart,
  Component,
  ComponentChannel,
  DataTable,
  Frame,
  h,
  type LogEntry,
  LogView,
  Menu,
  NumberInput,
  type PageSpec,
  Poll,
  Quiz,
  readControls,
  Roulette,
  Slider,
  Snake,
  SPIN_STEPS_MS,
  Tally,
  TextField,
  ToastShelf,
  ToggleList,
  Tree,
  type TreeNode,
  Wizard,
} from "../src/index.ts";
import { Colour, Key } from "../src/kit.ts";

const PAGE = 0x150;
const PROMPTS = [
  ["Index", 0x100],
  ["", null],
  ["", null],
  ["", null],
] as const;
/** The frame's first body row, and the hint row. */
const BODY_ROW = 3;
const HINT_ROW = 23;
/** One notch of the wheel, down (INPUT.md section 5.4). */
const NOTCH = 120;

function harness(specs: readonly PageSpec[]): Harness {
  return new Harness([new ComponentChannel(specs)]);
}

/** One viewer's page of `body`, every component its own. */
function viewer(...body: Child[]): Harness {
  const seen = harness([
    { page: PAGE, title: "Test", perViewer: true, root: () => h(Frame, { title: "Test", background: Colour.Blue, prompts: PROMPTS }, ...body) },
  ]);
  seen.join(1, PAGE);
  return seen;
}

/** The controls of the copy of the page the viewer sees, in reading order: its own while it has one, else the channel's, as Harness.seen reads the rows. */
function controls(page: Harness): Box[] {
  const ofPage = page.sent.filter((message) => Number.parseInt(String(message["page"]), 16) === PAGE);
  const own = ofPage.findLast(
    (message) => (message["type"] === "publish" || message["type"] === "release") && message[message["type"] === "publish" ? "owner" : "session"] === 1,
  );
  const seen = own?.["type"] === "publish" ? own : ofPage.findLast((message) => message["type"] === "publish" && message["owner"] === "channel");
  assert.ok(seen !== undefined, "the page was published");
  return [...(readControls(String(seen["tti"]))[0] ?? [])].sort((a, b) => a.row - b.row || a.column - b.column);
}

/** The row `row` of the viewer's page as text. */
function row(page: Harness, at: number): string {
  return text(page.seen(1, PAGE).rows, at);
}

/** The control over the first cell of `words` where the page shows them (a row's text is a character a cell). */
function controlBy(page: Harness, words: string): Box {
  const found = controls(page).find((control) => {
    const at = row(page, control.row).indexOf(words);
    return at >= control.column && at < control.column + control.width;
  });
  assert.ok(found !== undefined, `a control over "${words}"`);
  return found;
}

/** Runs the clock on by `by`, waking the channel at each time it asked for. */
function wait(page: Harness, by: number): void {
  page.runUntil(page.now + by);
}

function click(page: Harness, control: Box): void {
  page.clickLeft(1, control.column, control.row);
}

test("an action is a control over its text from its first character; a click there acts, beside it does not; disabled, it declares nothing; it never takes the keys", () => {
  const pressed: string[] = [];
  const page = viewer(
    h(Button, { label: "keys", onPress: () => pressed.push("button") }),
    h(Action, { text: "Do it", onPress: () => pressed.push("action") }),
    h(Action, { text: "Not now", disabled: true, onPress: () => pressed.push("never") }),
  );
  const action = controlBy(page, "Do it");
  assert.deepEqual(action, { row: BODY_ROW + 1, column: 1, width: "Do it".length, height: 1 });
  assert.equal(controls(page).length, 2, "the button and the action, not the disabled action");
  page.clickLeft(1, action.column + action.width, action.row);
  click(page, action);
  page.press(1, Key.Enter);
  assert.deepEqual(pressed, ["action", "button"], "the click past its text took nothing; Enter still went to the button");
});

test("a badge with onPress is a control over its chip; a log's PAUSED badge follows the newest again when clicked", () => {
  const pressed: number[] = [];
  const page = viewer(h(Badges, { badges: [{ text: "PLAIN" }, { text: "PRESS", onPress: (session: number) => pressed.push(session) }] }));
  const [badge, ...more] = controls(page);
  assert.ok(badge !== undefined && more.length === 0, "only the badge with onPress");
  click(page, badge);
  assert.deepEqual(pressed, [1]);

  const entries: LogEntry[] = Array.from({ length: 12 }, (_, index) => ({ at: Date.UTC(2026, 9, 28, 3, 0, index), level: "info", text: `entry ${index}` }));
  const log = viewer(h(LogView, { entries, shown: 4 }));
  assert.match(row(log, BODY_ROW + 4), /LIVE/u);
  log.wheel(1, -NOTCH, 5, BODY_ROW + 1);
  assert.match(row(log, BODY_ROW + 4), /PAUSED/u, "scrolled back");
  click(log, controlBy(log, "PAUSED"));
  assert.match(row(log, BODY_ROW + 4), /LIVE/u, "following again");
  assert.match(row(log, BODY_ROW + 3), /entry 11/u, "the newest at the bottom");
});

test("a crumb with an action is a control a click acts on; a menu's way down is one, and a click on a menu's name goes back to it", () => {
  const pressed: string[] = [];
  const crumbs = viewer(h(Breadcrumbs, { trail: [{ label: "Top", onPress: () => pressed.push("top") }, { label: "Here" }] }));
  click(crumbs, controlBy(crumbs, "Top"));
  assert.deepEqual(pressed, ["top"]);

  const page = viewer(
    h(Menu, { title: "Main", items: [{ label: "Tools", items: [{ label: "Saw", items: [{ label: "Blade" }] }] }, { label: "Help" }], onChoose: () => {} }),
  );
  page.press(1, Key.Enter);
  page.press(1, Key.Enter);
  // The English set's → is 0x5D (EN 300 706 Table 36), which the row's text shows as "]"; the arrows are blue.
  assert.match(row(page, BODY_ROW), /Main.\]\u0006Tools.\]\u0007Saw/u, "two menus down, the one open white");
  assert.match(row(page, BODY_ROW + 1), /Blade/u);
  const [main, tools] = controls(page).filter((control) => control.row === BODY_ROW);
  assert.ok(main !== undefined && tools !== undefined, "the two menus above are controls; the one open is not");
  click(page, tools);
  assert.match(row(page, BODY_ROW + 1), /Saw/u, "back to Tools");
  click(page, controlBy(page, "Main"));
  assert.match(row(page, BODY_ROW), /Main/u);
  assert.match(row(page, BODY_ROW + 1), /Tools/u, "back to the top");
  assert.match(row(page, BODY_ROW + 2), /Help/u);
});

test("a list's user hears the pointer come onto a row and leave it: a choice list's index, a toggle list's, a tree's node, a menu's path, a table's row", () => {
  const heard: unknown[] = [];
  const hear = (value: unknown): void => {
    heard.push(value);
  };
  const enterAndLeave = (page: Harness, control: Box): void => {
    page.hover(1, "enter", control.column, control.row);
    page.hover(1, "leave", control.column, control.row);
  };
  const choices = viewer(h(ChoiceList, { items: ["one", "two"], shown: 2, onChoose: () => {}, onHover: hear }));
  enterAndLeave(choices, controlBy(choices, "two"));
  const toggles = viewer(h(ToggleList, { items: ["one", "two"], onHover: hear }));
  enterAndLeave(toggles, controlBy(toggles, "two"));
  const nodes: TreeNode[] = [{ label: "root", children: [{ label: "leaf" }] }];
  const tree = viewer(
    h(Tree, {
      nodes,
      shown: 3,
      open: ["root"],
      onHover: (node: TreeNode | null) => {
        hear(node?.label ?? null);
      },
    }),
  );
  enterAndLeave(tree, controlBy(tree, "leaf"));
  const menu = viewer(h(Menu, { title: "Main", items: [{ label: "Tools", items: [{ label: "Saw" }] }], onChoose: () => {}, onHover: hear }));
  menu.press(1, Key.Enter);
  enterAndLeave(menu, controlBy(menu, "Saw"));
  const table = viewer(h(DataTable, { columns: [{ title: "Name", width: 10 }], rows: [["b"], ["a"]], shown: 2, selectable: true, onHover: hear }));
  // Under the heading's controls, the table's rows: b, then a.
  const [, second] = controls(table).filter((control) => control.row > BODY_ROW);
  assert.ok(second !== undefined, "the table's second row, a");
  enterAndLeave(table, second);
  assert.deepEqual(heard, [1, null, 1, null, "leaf", null, ["Tools", "Saw"], null, ["a"], null]);
});

test("the wheel scrolls a tree and a menu with more than they show", () => {
  const nodes: TreeNode[] = Array.from({ length: 8 }, (_, index) => ({ label: `node ${index}` }));
  const tree = viewer(h(Tree, { nodes, shown: 3 }));
  tree.wheel(1, 2 * NOTCH, 5, BODY_ROW);
  assert.match(row(tree, BODY_ROW), /node 2/u);
  const menu = viewer(h(Menu, { items: Array.from({ length: 8 }, (_, index) => ({ label: `choice ${index}` })), shown: 3, onChoose: () => {} }));
  menu.wheel(1, NOTCH, 5, BODY_ROW);
  assert.match(row(menu, BODY_ROW), /choice 1/u);
});

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
      { steps: ["One", "Two", "Three"], onStep: (step: number) => steps.push(step) },
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
  click(page, done[0] as Box);
  assert.deepEqual(steps, [1, 2, 0]);
  assert.equal(controls(page).filter((control) => control.row === BODY_ROW).length, 0, "on the first step nothing is done");
  click(page, controlBy(page, "green Next"));
  click(page, controlBy(page, "red Back"));
  assert.deepEqual(steps, [1, 2, 0, 1, 0]);
});

test("a roulette spins on a click on its prompt; while it spins its headline is no link; stopped, the headline goes to its page and the line under it spins again", () => {
  const articles: Article[] = [{ title: "A robot arm", page: 0x201, writer: "Ada", date: Date.UTC(2026, 9, 28), summary: "", blocks: [], tags: [], link: "" }];
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

test("a text field's band is a control, and a click there gives it the keys", () => {
  const typed: string[] = [];
  const page = viewer(
    h(Button, { label: "first", onPress: () => {} }),
    h(TextField, { label: "Name", longest: 10, onChange: (value: string) => typed.push(value) }),
  );
  // The band, from its prompt; the label before it is not the field's.
  const field = controlBy(page, "> ");
  page.typeText(1, "x");
  assert.deepEqual(typed, [], "the button has the keys");
  click(page, field);
  page.typeText(1, "ab");
  assert.deepEqual(typed, ["ab"]);
});

test("the wheel steps a slider and a number, up for more", () => {
  const values: number[] = [];
  const page = viewer(
    h(Slider, { label: "Volume", min: 0, max: 10, initial: 5, onChange: (value: number) => values.push(value) }),
    h(NumberInput, { label: "Count", min: 0, max: 9, initial: 3, onChange: (value: number) => values.push(value) }),
  );
  page.wheel(1, -NOTCH, 20, BODY_ROW);
  page.wheel(1, 2 * NOTCH, 20, BODY_ROW + 1);
  assert.deepEqual(values, [6, 1], "two notches in one turn are two steps at once");
});

/** An action that raises a toast for its viewer, as any component sends one on the bus. */
class RaiseToast extends Component {
  override render(): Child {
    return h(Action, {
      text: "raise",
      onPress: (session: number) => {
        this.services.bus.emit("toast", { kind: "info", text: "Saved" }, { session });
      },
    });
  }
}

test("a toast is a control, and a click puts it away before its time", () => {
  const page = viewer(h(ToastShelf, {}), h(RaiseToast, {}));
  click(page, controlBy(page, "raise"));
  const toast = controlBy(page, "Saved");
  assert.equal(toast.row, BODY_ROW, "the shelf's first row");
  click(page, toast);
  assert.doesNotMatch(row(page, BODY_ROW), /Saved/u);
  assert.equal(controls(page).length, 1, "the action alone");
});

test("a chart whose bars or columns can be chosen makes each a control; a click chooses it, and on one the hint row says what it is", () => {
  const chosen: number[] = [];
  const bars = [
    { label: "Mon", value: 3 },
    { label: "Tue", value: 6 },
  ];
  const barChart = viewer(h(BarChart, { bars, onChoose: (index: number) => chosen.push(index) }));
  const tuesday = controlBy(barChart, "Tue");
  click(barChart, tuesday);
  barChart.hover(1, "enter", tuesday.column, tuesday.row);
  assert.match(row(barChart, HINT_ROW), /Tue: 6/u);
  const columnChart = viewer(h(ColumnChart, { bars, plotRows: 3, onChoose: (index: number) => chosen.push(index) }));
  const [monday] = controls(columnChart);
  assert.ok(monday !== undefined);
  assert.equal(monday.height, 4, "the plot's rows and the label's");
  click(columnChart, monday);
  assert.deepEqual(chosen, [1, 0]);
  assert.deepEqual(controls(viewer(h(BarChart, { bars }))), [], "without onChoose, a chart declares nothing");
});

test("a choice list's row says what it is on the hint row while the pointer is on it, and the list's own hint comes back as it leaves", () => {
  const page = viewer(
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
