// The documents part's examples: pages of several sub-pages. Each is drawn
// in the example's own frame, so each shows its first sub-page.

import { articleLines, DayPages, Document, h, QrPanel, StoryPages } from "../../src/index.ts";
import { Colour } from "../../src/kit.ts";
import type { Part } from "./example.ts";

export const documents: Part = {
  part: "documents",
  title: "Documents",
  about:
    "Pages of several sub-pages, each named in its title band: a document's lines over as many screens as they need, a day's headlines a sub-page a day, and an article's home with its text, picture, links and where else it appears.",
  examples: [
    {
      component: "Document",
      whole: true,
      title: "Help over its sub-pages",
      build: () =>
        h(Document, {
          title: "Using teletext",
          background: Colour.Blue,
          prompts: [
            ["Index", 0x100],
            ["Search", 0x199],
          ],
          lines: articleLines(
            [
              { kind: "heading", text: "Finding a page" },
              { kind: "paragraph", text: "Type its three digits on the remote. The page comes up as soon as the last one is in." },
              { kind: "heading", text: "The coloured keys" },
              { kind: "paragraph", text: "Red, green, yellow and cyan take you to the pages named along the bottom row." },
              { kind: "item", text: "Index goes to the front page" },
              { kind: "item", text: "Reveal shows the answers to quizzes" },
            ],
            38,
          ),
        }),
    },
    {
      component: "DayPages",
      whole: true,
      title: "A day's headlines",
      build: () => {
        const story = { writer: "Sam Jones", date: Date.UTC(2026, 9, 27), blocks: [], tags: [] };
        return h(DayPages, {
          background: Colour.Red,
          prompts: [["Index", 0x100]],
          days: [
            {
              name: "Tuesday 27 Oct",
              articles: [
                { ...story, page: 0x104, title: "Council approves the new bridge over the Avon" },
                { ...story, page: 0x105, title: "Bus fares to rise by 10p in April" },
                { ...story, page: 0x106, title: "Rail strike called off after talks through the night" },
              ],
            },
          ],
        });
      },
    },
    {
      component: "StoryPages",
      whole: true,
      title: "An article's first sub-page",
      build: () =>
        h(StoryPages, {
          background: Colour.Blue,
          prompts: [["Index", 0x100]],
          article: {
            page: 0x104,
            title: "Council approves the new bridge over the Avon",
            writer: "Sam Jones",
            date: Date.UTC(2026, 9, 27, 14, 5),
            blocks: [
              { kind: "paragraph", text: "Work on the new bridge starts in March, the council said last night, after a vote of 31 to 12." },
              { kind: "quote", text: '"It is the biggest change to the city centre in fifty years," the leader said.' },
            ],
            tags: ["Bristol", "Transport"],
          },
          where: [
            { page: 0x101, label: "News headlines" },
            { page: 0x160, label: "Bristol news" },
          ],
        }),
    },
    {
      component: "QrPanel",
      title: "With the article's code",
      build: () =>
        h(QrPanel, {
          what: "The full article",
          title: "Council approves the new bridge over the Avon",
          // As `neottx qr --page 150 https://example.com/news/bridge` writes it.
          qr: [
            "PN,15000",
            "SC,0000",
            "PS,8000",
            "OL,2,\u001BW" + "\u007F".repeat(16) + "5",
            "OL,3,\u001BW\u007F\u007Fcssk#k?kocssk\u007F5",
            "OL,4,\u001BW\u007F\u007Fj jj%iuk~j jj\u007F5",
            "OL,5,\u001BW\u007F\u007Frsszjjz*krssz\u007F5",
            "OL,6,\u001BW\u007F\u007Fd2!&t6b64p&ej\u007F5",
            "OL,7,\u001BW\u007F\u007Ftp:qa5/6j!}?k\u007F5",
            "OL,8,\u001BW\u007F\u007F,`6n) n} &a>~\u007F5",
            "OL,9,\u001BW\u007F\u007Fcssk$$f/j{j?j\u007F5",
            "OL,10,\u001BW\u007F\u007Fj jj%&~9$<*3o\u007F5",
            "OL,11,\u001BW\u007F\u007Frsszzt\u007F|xxv\u007F{\u007F5",
            "OL,12,\u001BW" + "\u007F".repeat(16) + "5",
          ].join("\n"),
        }),
    },
    {
      component: "QrPanel",
      title: "Without a code",
      build: () => h(QrPanel, { what: "The full article", title: "Council approves the new bridge over the Avon" }),
    },
  ],
};
