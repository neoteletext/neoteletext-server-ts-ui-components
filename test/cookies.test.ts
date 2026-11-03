// A viewer's cookies and language in the services (REQ-2217): read as the
// server gave them, set through the kit, and the viewer's language taken
// from the `language` cookie, which a LanguagePicker sets.

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness } from "neoteletext-server-ts-protocol/testing";
import {
  type Element,
  type Child,
  Component,
  isPress,
  ComponentChannel,
  type ComponentChannelOptions,
  type KeyEvent,
  LanguagePicker,
  type PageSpec,
  Text,
  h,
} from "../src/index.ts";
import { Key } from "../src/kit.ts";
import { frame, PAGE } from "./components-fixtures.ts";

/** What a component reads of the services, and a key that sets a cookie. */
class CookieShow extends Component {
  override render(): Child {
    const { session } = this.services;
    const cookies = session === null ? {} : this.services.cookies(session);
    const pairs = Object.entries(cookies).map(([name, value]) => `${name}=${value}`);
    return h(Text, { text: `${pairs.join(" ")}; ${this.services.language(session)}` });
  }

  override focusable(): boolean {
    return true;
  }

  override needs(): { readonly ownCopy: true } {
    return { ownCopy: true };
  }

  override onKey(event: KeyEvent): boolean {
    if (isPress(event, "s")) {
      this.services.setCookie(event.session, "seen", "yes", { maxAge: 60 });
    } else if (isPress(event, "r")) {
      this.services.setCookie(event.session, "seen", "", { maxAge: 0 });
    } else {
      return false;
    }
    this.forceUpdate();
    return true;
  }
}

function channel(specs: readonly PageSpec[], options: ComponentChannelOptions = {}): Harness {
  return new Harness([new ComponentChannel(specs, { opus: fakeOpus(), ...options })]);
}

function cookieLines(page: Harness): unknown[] {
  return page.sent.filter((message) => message["type"] === "cookie");
}

test("REQ-2217 item 1: a component reads the viewer's cookies as the server gave them and as it set them, set through the kit", () => {
  const page = channel([{ page: PAGE, title: "Cookies", root: (): Element => frame("Cookies", h(CookieShow, {})) }]);
  page.join(1, PAGE, [{ name: "theme", value: "dark" }]);
  const seen = (): string => (page.own(1, PAGE)[3] ?? []).map((code) => String.fromCodePoint(code)).join("");
  assert.match(seen(), /theme=dark; en/u);
  page.press(1, "s");
  assert.match(seen(), /theme=dark seen=yes;/u, "at once");
  assert.deepEqual(cookieLines(page), [
    { type: "cookie", connection: 1, name: "seen", value: "yes", path: null, max_age: 60, same_site: null, secure: false, http_only: false },
  ]);
  page.press(1, "r");
  assert.match(seen(), /theme=dark;/u, "max-age 0 removes it");
});

test("REQ-2217 item 2: the viewer's language is their language cookie when the server lists it, else the channel's", () => {
  const spec: PageSpec = { page: PAGE, title: "Language", root: (): Element => frame("Language", h(CookieShow, {})) };
  const page = channel([spec], { language: "de" });
  page.join(1, PAGE, [{ name: "language", value: "ru" }]);
  page.join(2, PAGE, [{ name: "language", value: "xx" }]);
  page.join(3, PAGE);
  const language = (session: number): string | undefined =>
    (page.channel.copy(session, PAGE) ?? page.channel.copy("channel", PAGE))?.at(-1)?.content.language ?? undefined;
  assert.equal(language(1), "ru");
  assert.equal(language(2), "de", "a tag the server does not list is no language");
  assert.equal(language(3), "de");
});

test("REQ-2217 item 2: a page with no language of its own is the viewer's copy in their language; the others share the channel's", () => {
  const page = channel([{ page: PAGE, title: "Text", root: (): Element => frame("Text", h(Text, { text: "Hello" })) }]);
  page.join(1, PAGE, [{ name: "language", value: "ru" }]);
  page.join(2, PAGE);
  assert.equal(page.channel.copy(1, PAGE)?.at(-1)?.content.language, "ru");
  assert.equal(page.channel.copy(2, PAGE), undefined, "viewer 2 sees the shared copy");
  assert.equal(page.channel.copy("channel", PAGE)?.at(-1)?.content.language, "en");
});

test("REQ-2217 item 3: the language picker lists the server's languages, and a choice sets the cookie and draws that viewer's pages again in it", () => {
  const page = channel([
    {
      page: PAGE,
      title: "Languages",
      root: (): Element =>
        frame(
          "Languages",
          h(LanguagePicker, { shown: 10, autoFocus: true, languages: ["en", "ru", "ar", "th"], names: { ru: "Русский", ar: "العربية", th: "ไทย" } }),
        ),
    },
  ]);
  page.join(1, PAGE);
  page.join(2, PAGE);
  page.press(1, Key.Down);
  page.press(1, Key.Enter);
  assert.deepEqual(cookieLines(page), [
    { type: "cookie", connection: 1, name: "language", value: "ru", path: "/", max_age: 31_536_000, same_site: "Lax", secure: false, http_only: false },
  ]);
  const content = page.channel.copy(1, PAGE)?.at(-1)?.content;
  assert.equal(content?.language, "ru", "viewer 1's page again, in Russian");
  assert.ok(
    (content?.text ?? []).some((run) => run.text.includes("Русский") && run.language === "ru"),
    "a language's own name, in it",
  );
  assert.ok(
    (content?.text ?? []).some((run) => run.text === "Thai" && run.language === "en"),
    "Thai by its English name: its own would take three rows of the list",
  );
  assert.notEqual(page.channel.copy(2, PAGE)?.at(-1)?.content.language, "ru", "viewer 2's is not");
});
