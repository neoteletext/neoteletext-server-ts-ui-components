// QrPanel: a QR code a phone can follow, and beside it what it leads to.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { Picture } from "../graphics/picture.ts";
import { Colour } from "../kit.ts";
import { Columns } from "../layout/columns.ts";
import { Gap } from "../layout/gap.ts";
import { Rows } from "../layout/layouts.ts";
import { Placeholder } from "../text/placeholder.ts";
import { Paragraph } from "../text/paragraph.ts";

export interface QrPanelProps {
  /** The code as a TTI page, from `neottx qr`; a placeholder says there is none when absent. */
  readonly qr?: string;
  /** What the code leads to, and its title, written beside it. */
  readonly what: string;
  readonly title: string;
}

/** The QR code's columns: `neottx qr` wrote a 60-character address as rows 2 to 15, 22 cells across (measured 26 October 2026). */
const QR_CELLS = 24;

export class QrPanel extends Component<QrPanelProps> {
  override render(): Child {
    return h(
      Columns,
      { widths: [QR_CELLS, null] },
      this.props.qr === undefined ? h(Placeholder, { text: "(no QR tool)" }) : h(Picture, { tti: this.props.qr, firstRow: 2 }),
      h(
        Rows,
        {},
        h(Gap, {}),
        h(Paragraph, { text: this.props.what, foreground: Colour.Yellow }),
        h(Gap, {}),
        h(Paragraph, { text: "Scan the code with a phone to open it", foreground: Colour.White }),
        h(Gap, {}),
        h(Paragraph, { text: this.props.title, foreground: Colour.Cyan, lines: 3 }),
      ),
    );
  }
}
