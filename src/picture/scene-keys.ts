// Keys of a picture scene's parts, each the same exactly when what that
// part draws is: a base row, a component's drawing or object, the caret and
// the links. A writer compares them with the last render's to send only
// what changed (renderer parity PAR-42, "Repainting").

import { COLUMNS } from "./grid.ts";
import type { PictureScene } from "./scene.ts";
import type { PictureLink } from "./update.ts";

/** What a writer keeps of the last scene it wrote. */
export interface SceneKeys {
  /** Each row's base key, by row. */
  readonly base: readonly string[];
  /** Each component's key, by its number. */
  readonly components: ReadonlyMap<number, string>;
  readonly cursor: string | null;
  readonly links: string;
}

/** A row's cells drawn in the base (`isBase` of their owner), and the place of every other, which the base does not draw. */
export function baseRowKey(scene: PictureScene, row: number, isBase: (owner: number) => boolean): string {
  const line = scene.cells[row] ?? [];
  const owners = scene.owners[row] ?? [];
  const parts: unknown[] = [];
  for (let column = 0; column < COLUMNS; column += 1) {
    parts.push(isBase(owners[column] ?? 0) ? (line[column] ?? null) : null);
  }
  return JSON.stringify(parts);
}

/** Each component's key: its cells with their places, its controls, label, link and whether it is detectable; with the rollover colours, which its hover look is drawn in. */
export function componentKeys(scene: PictureScene, rollover: boolean): Map<number, string> {
  const cells = new Map<number, unknown[]>();
  scene.owners.forEach((owners, row) => {
    owners.forEach((owner, column) => {
      if (owner !== 0) {
        const list = cells.get(owner) ?? [];
        list.push([row, column, scene.cells[row]?.[column] ?? null]);
        cells.set(owner, list);
      }
    });
  });
  const keys = new Map<number, string>();
  for (const [number, component] of scene.components) {
    keys.set(number, JSON.stringify([cells.get(number) ?? [], component.controls, component.label, component.detectable, rollover]));
  }
  return keys;
}

/** The caret's place, or null without one. */
export function cursorKey(scene: PictureScene): string | null {
  return scene.cursor === null ? null : `${scene.cursor.row}:${scene.cursor.column}`;
}

/** The picture's links: every component with one, in the order of their numbers. */
export function linksOf(scene: PictureScene): PictureLink[] {
  return [...scene.components.values()]
    .flatMap((component) => (component.link === null ? [] : [{ number: component.number, target: component.link }]))
    .toSorted((a, b) => a.number - b.number);
}

export function linksKey(links: readonly PictureLink[]): string {
  return JSON.stringify(links);
}

/** The cursor message owed: `shown` (the caret's number, or 0 for none) when it differs from what `last` showed, or after a restart when there is one; null when none is owed. */
export function cursorChange(last: SceneKeys | null, shown: number, caretNumber: number): number | null {
  if (last === null) {
    return shown === 0 ? null : shown;
  }
  const before = last.cursor === null ? 0 : caretNumber;
  return before === shown ? null : shown;
}

/** The links owed: `links` when they differ from what `last` had, or after a restart when there are any; null when none are owed. */
export function linksChange(last: SceneKeys | null, links: readonly PictureLink[]): readonly PictureLink[] | null {
  const changed = last === null ? links.length > 0 : linksKey(links) !== last.links;
  return changed ? links : null;
}
