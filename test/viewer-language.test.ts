// A viewer's language in the services (REQ-2217 items 2 and 3): the one they
// chose with a LanguagePicker when the server lists it, else the channel's,
// and their pages drawn again in it as they choose.

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness } from "neoteletext-server-ts-protocol/testing";
import { type Element, ComponentChannel, type ComponentChannelOptions, LanguagePicker, type PageSpec, Text, h } from "../src/index.ts";
import { Key } from "../src/kit.ts";
import { frame, PAGE } from "./components-fixtures.ts";

/** A picker of four languages, the first English, then Russian. */
const PICKER: PageSpec = {
  page: PAGE,
  title: "Languages",
  root: (): Element =>
    frame("Languages", h(LanguagePicker, { shown: 10, autoFocus: true, languages: ["en", "ru", "ar", "el"], names: { ru: "Русский", ar: "العربية" } })),
};

function channel(specs: readonly PageSpec[], options: ComponentChannelOptions = {}): Harness {
  return new Harness([new ComponentChannel(specs, { opus: fakeOpus(), ...options })]);
}

/** The language of the latest sub-page `connection` was sent of PAGE: its own copy's, else the channel's. */
function languageOf(page: Harness, connection: number): string | undefined {
  return (page.channel.copy(connection, PAGE) ?? page.channel.copy("channel", PAGE))?.at(-1)?.content.language ?? undefined;
}

test("REQ-2217 item 2: a viewer who chose no language sees the channel's", () => {
  const page = channel([{ page: PAGE, title: "Text", root: (): Element => frame("Text", h(Text, { text: "Hello" })) }], { language: "de" });
  page.join(1, PAGE);
  assert.equal(page.channel.copy(1, PAGE), undefined, "the shared copy");
  assert.equal(languageOf(page, 1), "de");
});

test("REQ-2217 item 3: the language picker lists the server's languages, and a choice draws that viewer's pages again in it", () => {
  const page = channel([PICKER]);
  page.join(1, PAGE);
  page.join(2, PAGE);
  page.press(1, Key.Down);
  page.press(1, Key.Enter);
  const content = page.channel.copy(1, PAGE)?.at(-1)?.content;
  assert.equal(content?.language, "ru", "viewer 1's page again, in Russian");
  assert.ok(
    (content?.text ?? []).some((run) => run.text.includes("Русский") && run.language === "ru"),
    "a language's own name, in it",
  );
  assert.ok(
    (content?.text ?? []).some((run) => run.text === "Greek" && run.language === "en"),
    "a language the channel gives no name for, by its English name",
  );
  assert.notEqual(languageOf(page, 2), "ru", "viewer 2's is not");
  assert.equal(page.sent.filter((message) => message["type"] === "cookie").length, 0, "no cookie is written: there is none (VS-408)");
});
