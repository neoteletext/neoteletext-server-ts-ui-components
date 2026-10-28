// QrPanel: a QR code a phone can follow, and beside it what it leads to.
// Without a code, a placeholder stands in its place, on the row its text
// starts on, and the text says nothing of scanning.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { Picture } from "../graphics/picture.ts";
import { Colour } from "../kit.ts";
import { Columns } from "../layout/columns.ts";
import { Gap } from "../layout/gap.ts";
import { Rows } from "../layout/layouts.ts";
import { Paragraph } from "../text/paragraph.ts";
import { Text } from "../text/styles.ts";

export interface QrPanelProps {
  /** The code as a TTI page, from `neottx qr`; a placeholder says there is none when absent. */
  readonly qr?: string;
  /** What the code leads to, written beside it in yellow. */
  readonly what: string;
  /** The title of what it leads to, under that in cyan, on three lines at most. */
  readonly title: string;
}

/** The QR code's columns: `neottx qr` wrote a 60-character address as rows 2 to 15, 22 cells across (measured 26 October 2026). */
const QR_CELLS = 24;

export class QrPanel extends Component<QrPanelProps> {
  override render(): Child {
    const { qr } = this.props;
    return h(
      Columns,
      { widths: [QR_CELLS, null] },
      qr === undefined ? h(Rows, {}, h(Gap, {}), h(Text, { text: "(no QR tool)" })) : h(Picture, { tti: qr, firstRow: 2 }),
      h(
        Rows,
        {},
        h(Gap, {}),
        h(Paragraph, { text: this.props.what, foreground: Colour.Yellow }),
        qr === undefined ? null : h(Gap, {}),
        qr === undefined ? null : h(Paragraph, { text: "Scan the code with a phone to open it", foreground: Colour.White }),
        h(Gap, {}),
        h(Paragraph, { text: this.props.title, foreground: Colour.Cyan, lines: 3 }),
      ),
    );
  }
}
