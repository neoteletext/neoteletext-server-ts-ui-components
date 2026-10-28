// What the docs read of the source (generate.ts): the exports each part's
// index names and their files, a file's opening comment, the props
// interface a component's class takes, and every exported interface's
// props, each with its comment.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");

/** Every export named by a part's index, and the file it comes from. */
export function exportFiles(part: string): Map<string, string> {
  const files = new Map<string, string>();
  const index = readFileSync(join(SRC, part, "index.ts"), "utf8");
  for (const match of index.matchAll(/^export \{ ([^}]*) \} from "\.\/([^"]+)";/gmu)) {
    for (const name of (match[1] ?? "").split(",").map((each) => each.trim())) {
      files.set(name, join(SRC, part, match[2] ?? ""));
    }
  }
  return files;
}

/** A file's opening comment, as paragraphs: its `//` lines before the first that is not one, lint directives aside. */
export function openingComment(source: string): string {
  const lines: string[] = [];
  for (const line of source.split("\n")) {
    if (!line.startsWith("//")) {
      break;
    }
    if (!line.includes("oxlint-disable")) {
      lines.push(line.replace(/^\/\/ ?/u, ""));
    }
  }
  return lines
    .join("\n")
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.replaceAll("\n", " ").trim())
    .filter((paragraph) => paragraph !== "")
    .join("\n\n");
}

/** A type's arguments, split at its top-level commas. */
function typeArguments(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const character of text) {
    if (character === "<" || character === "(" || character === "[" || character === "{") {
      depth += 1;
    } else if (character === ">" || character === ")" || character === "]" || character === "}") {
      depth -= 1;
    }
    if (character === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  return [...parts, current.trim()].filter((part) => part !== "");
}

/** The name of `component`'s props interface, read from its class's base: its first type argument, or a ValueControl's second. */
export function propsName(source: string, component: string): string | null {
  const declared = new RegExp(`class ${component}(?:<[^{]*?>)? extends (\\w+)<(.*)> \\{`, "u").exec(source);
  if (declared === null) {
    return null;
  }
  const args = typeArguments(declared[2] ?? "");
  const props = declared[1] === "ValueControl" ? args[1] : args[0];
  return props === undefined ? null : props.replace(/<.*$/u, "");
}

/** One prop: its name, whether it is optional, its type, and what its comment says. */
interface Prop {
  readonly name: string;
  readonly optional: boolean;
  readonly type: string;
  readonly about: string;
}

/** An interface found in the source: its props and what it extends. */
export interface Interface {
  readonly props: readonly Prop[];
  readonly extends: readonly string[];
}

/** The props in an interface's body, a line each: `readonly name?: type;` and the comment before it. */
function propsOf(body: string): Prop[] {
  const props: Prop[] = [];
  let comment: string[] = [];
  let inComment = false;
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("/**")) {
      inComment = true;
      comment = [];
    }
    if (inComment) {
      comment.push(
        trimmed
          .replace(/^\/\*\*\s?/u, "")
          .replace(/\*\/$/u, "")
          .replace(/^\*\s?/u, "")
          .trim(),
      );
      inComment = !trimmed.endsWith("*/");
      continue;
    }
    const declared = /^readonly (\w+)(\??): (.*);$/u.exec(trimmed);
    if (declared !== null) {
      props.push({ name: declared[1] ?? "", optional: declared[2] === "?", type: declared[3] ?? "", about: comment.join(" ").trim() });
    }
    comment = [];
  }
  return props;
}

/** The data shapes a props interface's types name, and theirs in turn, in the order found: what its tables need to be read. Props interfaces and those every control shares are left to their own pages. */
/** Every `export interface` in src, by name. */
export function interfaces(): Map<string, Interface> {
  const found = new Map<string, Interface>();
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else if (entry.name.endsWith(".ts")) {
        for (const match of readFileSync(path, "utf8").matchAll(/^export interface (\w+)(?:<[^>]*>)?(?: extends ([^{]*))? \{\n([\s\S]*?)^\}/gmu)) {
          found.set(match[1] ?? "", { props: propsOf(match[3] ?? ""), extends: typeArguments(match[2] ?? "").map((each) => each.replace(/<.*$/u, "")) });
        }
      }
    }
  };
  visit(SRC);
  return found;
}
