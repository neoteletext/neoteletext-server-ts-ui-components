// The docs' pages of components, made from the catalogue (catalogue/) and
// the source: for each part a page, and on it each component's account
// (its file's opening comment), its props (its props interface, each
// prop's comment its words), its keys and what it takes of its page (asked
// of the component itself), and its examples, each its picture and its
// code, which is the example's own source. Nothing on the pages is written
// by hand, so nothing there can fall out of step with the code; a test
// (docs.test.ts) fails when the pages on disk are not what this makes.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Component } from "../../src/index.ts";
import { flatten, isElement } from "../../src/core/element.ts";
import { type Example, exampleName, type Part } from "../catalogue/example.ts";
import { exportFiles, type Interface, interfaces, openingComment, propsName } from "./source.ts";

/** A page to write: its path under docs/, and what it says. */
export interface DocPage {
  readonly path: string;
  readonly text: string;
}

/** The library's own plumbing, which a page makes with `h` rather than fills in: not a shape to tabulate. */
const PLUMBING = new Set(["Element", "WithChildren"]);

function shapesUsed(props: string, known: Map<string, Interface>): string[] {
  const found: string[] = [];
  const visit = (name: string): void => {
    for (const prop of known.get(name)?.props ?? []) {
      for (const word of prop.type.match(/\b[A-Z]\w*\b/gu) ?? []) {
        if (known.has(word) && !word.endsWith("Props") && !PLUMBING.has(word) && !found.includes(word) && word !== props) {
          found.push(word);
          visit(word);
        }
      }
    }
  };
  visit(props);
  return found;
}

/** A cell of a Markdown table: its pipes escaped, and its code in backticks kept whole. */
function cell(text: string): string {
  return text.replaceAll("|", "\\|");
}

function propsTable(name: string, known: Map<string, Interface>): string[] {
  const found = known.get(name);
  if (found === undefined) {
    return ["It takes no props of its own."];
  }
  const lines = ["| Prop | Type | What it is |", "| --- | --- | --- |"];
  for (const prop of found.props) {
    lines.push(`| \`${prop.name}\`${prop.optional ? "" : " (needed)"} | \`${cell(prop.type)}\` | ${cell(prop.about)} |`);
  }
  const inherited = found.extends.filter((each) => known.has(each));
  return [
    ...(found.props.length === 0 ? ["It takes no props of its own."] : lines),
    ...(inherited.length === 0 ? [] : ["", `And the props of ${inherited.map((each) => `[\`${each}\`](common.md#${each.toLowerCase()})`).join(" and ")}.`]),
  ];
}

/** An arrow function's body, as its source has it, dedented: the example's code. */
function bodyOf(run: (...args: never[]) => unknown): string {
  const source = run.toString();
  const body = source.replace(/^\([^)]*\)\s*=>\s*/u, "");
  const block = /^\{\n([\s\S]*)\n\s*\}$/u.exec(body);
  const lines = (block === null ? body : (block[1] ?? "")).split("\n");
  const indent = Math.min(
    ...lines
      .slice(block === null ? 1 : 0)
      .filter((line) => line.trim() !== "")
      .map((line) => /^ */u.exec(line)?.[0].length ?? 0),
  );
  return lines.map((line, index) => (index === 0 && block === null ? line : line.slice(Number.isFinite(indent) ? indent : 0))).join("\n");
}

/** What a component's keys do and what it takes of its page, asked of it made from its first example's element; null when it cannot be asked unmounted. */
function asked(example: Example): { keys: string[]; needs: string[] } | null {
  const built = example.build();
  const element = flatten(built)[0] ?? null;
  if (!isElement(element) || element.type.name !== example.component) {
    return null;
  }
  try {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the element's class, made as the mount makes it, from the element's own props
    const component = new (element.type as unknown as new (props: object) => Component)(element.props);
    const needs = component.needs();
    return {
      keys: component.keyBindings().map(([key, action]) => `\`${key}\` ${action}`),
      needs: [
        needs.digits === true ? "the digits" : "",
        needs.colourKeys === true ? "the coloured keys" : "",
        needs.ownCopy === true ? "a copy of the page for each viewer" : "",
      ].filter((each) => each !== ""),
    };
  } catch {
    return null;
  }
}

function componentSection(component: string, examples: readonly Example[], part: Part, files: Map<string, string>, known: Map<string, Interface>): string[] {
  const file = files.get(component);
  const source = file === undefined ? "" : readFileSync(file, "utf8");
  const props = propsName(source, component);
  const first = examples[0];
  const learned = first === undefined ? null : asked(first);
  const lines = [`## ${component}`, "", openingComment(source), "", "```ts", `import { ${component} } from "neottx-server-ts-ui-components";`, "```", ""];
  if (learned !== null && learned.keys.length > 0) {
    lines.push(`**Keys:** ${learned.keys.join("; ")}.`, "");
  }
  if (learned !== null && learned.needs.length > 0) {
    lines.push(`**It takes of its page:** ${learned.needs.join(", ")}.`, "");
  }
  lines.push("### Props", "", ...(props === null ? ["Its props are its base's."] : propsTable(props, known)), "");
  for (const shape of props === null ? [] : shapesUsed(props, known)) {
    lines.push(`#### ${shape}`, "", ...propsTable(shape, known), "");
  }
  for (const example of examples) {
    const name = exampleName(example);
    lines.push(
      `### ${example.title}`,
      "",
      `![${component}: ${example.title}](../images/${part.part}/${name}.png)`,
      "",
      "```ts",
      bodyOf(example.build),
      "```",
      "",
    );
    if (example.act !== undefined) {
      lines.push("Then the viewer:", "", "```ts", bodyOf(example.act), "```", "");
    }
  }
  return lines;
}

function partPage(part: Part, known: Map<string, Interface>): DocPage {
  const files = exportFiles(part.part);
  const components = [...new Set(part.examples.map((example) => example.component))];
  const lines = [`# ${part.title}`, "", part.about, "", ...components.map((component) => `- [${component}](#${component.toLowerCase()})`), ""];
  for (const component of components) {
    lines.push(
      ...componentSection(
        component,
        part.examples.filter((example) => example.component === component),
        part,
        files,
        known,
      ),
    );
  }
  return {
    path: join("components", `${part.part}.md`),
    text: `${lines
      .join("\n")
      .replaceAll(/\n{3,}/gu, "\n\n")
      .trimEnd()}\n`,
  };
}

/** Every prop of a props interface in src with no comment to say what it is, as "Interface.prop": none, or the docs have a gap. */
export function undocumentedProps(): string[] {
  return [...interfaces()]
    .filter(([name]) => name.endsWith("Props"))
    .flatMap(([name, found]) => found.props.filter((prop) => prop.about === "").map((prop) => `${name}.${prop.name}`));
}

/** The props interfaces others extend, each with its props: the page they all link to. */
function commonPage(known: Map<string, Interface>): DocPage {
  const shared = [...new Set([...known].filter(([name]) => name.endsWith("Props")).flatMap(([, each]) => each.extends))]
    .filter((name) => known.has(name))
    .toSorted();
  const lines = [
    "# Common props",
    "",
    "The props interfaces that components' props extend: what every control, every control with a value, and the like, takes.",
    "",
  ];
  for (const name of shared) {
    lines.push(`## ${name}`, "", ...propsTable(name, known), "");
  }
  return { path: join("components", "common.md"), text: `${lines.join("\n").trimEnd()}\n` };
}

/** Every page of components, and their index. */
export function generate(parts: readonly Part[]): DocPage[] {
  const known = interfaces();
  const pages = [...parts.filter((part) => part.examples.length > 0).map((part) => partPage(part, known)), commonPage(known)];
  const index = [
    "# Components",
    "",
    "Every component of the library, by part: what it is, its props, its keys, and examples, each its picture and the code that drew it.",
    "",
    ...parts.filter((part) => part.examples.length > 0).map((part) => `- [${part.title}](${part.part}.md): ${part.about}`),
    "- [Common props](common.md): what every control, and every control with a value, takes.",
    "",
  ];
  return [...pages, { path: join("components", "README.md"), text: index.join("\n") }];
}
