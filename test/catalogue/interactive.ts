// The interactive part's examples: a live poll, a quiz and a list of sounds.

import { h, Poll, Quiz, SoundList, Tally, tone } from "../../src/index.ts";
import { Key } from "../../src/kit.ts";
import type { Part } from "./example.ts";

export const interactive: Part = {
  part: "interactive",
  title: "Interactive",
  about:
    "What viewers take part in: a poll whose votes every viewer sees as they come, kept in a tally the channel holds; a quiz answered with the coloured keys; and sounds to play.",
  examples: [
    {
      component: "Poll",
      title: "Votes coming in",
      build: () => {
        // A channel makes its tally once, beside its pages, so every viewer's copy of the poll counts the same votes.
        const tally = new Tally("Best Christmas film", ["Elf", "Home Alone", "Die Hard", "Love Actually"]);
        [0, 2, 1, 2, 3, 2, 0, 2, 1, 3, 2].forEach((option, viewer) => {
          tally.vote(100 + viewer, option);
        });
        return h(Poll, { tally });
      },
    },
    {
      component: "Poll",
      title: "Your vote cast",
      build: () => {
        const tally = new Tally("Best Christmas film", ["Elf", "Home Alone", "Die Hard", "Love Actually"]);
        [0, 2, 1, 2, 3, 2, 0, 2, 1, 3, 2].forEach((option, viewer) => {
          tally.vote(100 + viewer, option);
        });
        return h(Poll, { tally });
      },
      act: (page) => {
        page.press(1, Key.Down);
        page.press(1, Key.Enter);
      },
    },
    {
      component: "Quiz",
      title: "A question",
      build: () =>
        h(Quiz, {
          questions: [
            { question: "Which planet is nearest the sun?", answers: ["Venus", "Mercury", "Mars", "Earth"], right: 1 },
            { question: "How many sides has a hexagon?", answers: ["Five", "Six", "Seven", "Eight"], right: 1 },
          ],
        }),
    },
    {
      component: "Quiz",
      title: "After a wrong answer",
      build: () =>
        h(Quiz, {
          questions: [
            { question: "Which planet is nearest the sun?", answers: ["Venus", "Mercury", "Mars", "Earth"], right: 1 },
            { question: "How many sides has a hexagon?", answers: ["Five", "Six", "Seven", "Eight"], right: 1 },
          ],
        }),
      act: (page) => {
        page.press(1, Key.Red);
      },
    },
    {
      component: "SoundList",
      title: "One playing",
      build: () =>
        h(SoundList, {
          sounds: [
            { name: "Chime", samples: tone(880, 600) },
            { name: "Doorbell", samples: tone(660, 900, "square", 0.4) },
            { name: "Alarm", samples: tone(440, 1_500, "triangle") },
          ],
          shown: 3,
        }),
      act: (page) => {
        page.press(1, Key.Down);
        page.press(1, Key.Enter);
      },
    },
  ],
};
