// Rows: the default stack (core/component.ts), named; the other layouts
// have a file each in this folder.

import { Component } from "../core/component.ts";

/** Children top to bottom, each as tall as it measures, sharing what is left by `grow`. */
export class Rows extends Component {}
