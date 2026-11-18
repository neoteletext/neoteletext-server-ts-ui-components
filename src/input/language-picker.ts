// LanguagePicker: the server's languages to choose from (REQ-2217 item 3),
// each by its name in its own language where the channel gives one and by
// its English name otherwise, in a list that scrolls. A choice sets the
// viewer's language, which draws every page they have open again in it
// (Services.setLanguage): a channel needs no code of its own to switch
// language.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import type { Language, LanguageTag } from "../kit.ts";
import { ChoiceList } from "../lists/choice-list.ts";
import { Text } from "../text/styles.ts";
import type { ControlProps } from "./control.ts";

export interface LanguagePickerProps extends ControlProps {
  /** The rows it shows; the rest scroll. */
  readonly shown: number;
  /** Each language's name in its own language, where the channel has it; its English name, from the server, otherwise. */
  readonly names?: Readonly<Partial<Record<LanguageTag, string>>>;
  /** The languages it offers, in this order; every one the server lists when absent. */
  readonly languages?: readonly LanguageTag[];
  /** A viewer chose a language: after it is set. */
  readonly onChoose?: (language: LanguageTag, connection: number) => void;
}

/** The server's languages as a list; a choice sets the viewer's language. */
export class LanguagePicker extends Component<LanguagePickerProps> {
  /** The languages offered, as the server lists them. */
  get #offered(): Language[] {
    // Unmounted (the probe of the page's needs), the server's languages are not known yet.
    const listed = this.mounted ? this.services.languages() : [];
    const wanted = this.props.languages;
    return wanted === undefined ? [...listed] : wanted.flatMap((tag) => listed.filter((language) => language.tag === tag));
  }

  /** The name a language is listed by, and the language it is written in. */
  #name(language: Language): { readonly text: string; readonly language: LanguageTag } {
    const own = this.props.names?.[language.tag];
    return own === undefined ? { text: language.name, language: "en" } : { text: own, language: language.tag };
  }

  override render(): Child {
    const offered = this.#offered;
    const connection = this.mounted ? this.services.connection : null;
    const current = connection === null ? -1 : offered.findIndex((language) => language.tag === this.services.language(connection));
    const { shown, names: _names, languages: _languages, onChoose, ...control } = this.props;
    return h(ChoiceList<Language>, {
      ...control,
      items: offered,
      shown,
      initial: Math.max(0, current),
      itemKey: (language) => language.tag,
      text: (language) => this.#name(language).text,
      render: (language, look) => {
        const name = this.#name(language);
        return h(Text, { text: name.text, foreground: look.foreground, language: name.language });
      },
      onChoose: (index, viewer) => {
        const chosen = offered[index];
        if (chosen === undefined) {
          return;
        }
        this.services.setLanguage(viewer, chosen.tag);
        onChoose?.(chosen.tag, viewer);
      },
    });
  }
}
