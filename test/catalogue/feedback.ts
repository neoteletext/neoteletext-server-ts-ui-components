// The feedback part's examples: progress, loading, notices, figures, and the audio player and its parts.

import {
  AudioPlayer,
  Button,
  type Child,
  Component,
  h,
  LineGauge,
  ListeningView,
  Loading,
  MetricCard,
  Notice,
  NowPlaying,
  PlayerStatus,
  PlayerView,
  PlayQueue,
  ProgressBar,
  ProgressList,
  RATE,
  Skeleton,
  Spinner,
  TaskList,
  ToastShelf,
  tone,
  Transport,
} from "../../src/index.ts";
import { Colour, Key } from "../../src/kit.ts";
import type { Part } from "./example.ts";

export const feedback: Part = {
  part: "feedback",
  title: "Feedback",
  about:
    "What tells the viewer how things stand: how far along or how full, what is still loading, notices and toasts, a dashboard's figures, and a player for sound, with its queue, its modes and a spectrum.",
  examples: [
    {
      component: "ProgressBar",
      title: "Labelled, in segments, coloured by how full",
      build: () => [
        h(ProgressBar, { key: "copy", label: "Copying", value: 62, max: 100, percent: true }),
        h(ProgressBar, { key: "battery", label: "Battery", value: 3, max: 4, foreground: Colour.Green, separated: true, percent: true }),
        h(ProgressBar, { key: "disk", label: "Disk", value: 94, max: 100, foreground: Colour.Green, thresholds: [[0.9, Colour.Red]], percent: true }),
      ],
    },
    {
      component: "LineGauge",
      title: "A thin line",
      build: () => [
        h(LineGauge, { key: "cpu", label: "CPU", value: 41, max: 100 }),
        h(LineGauge, { key: "memory", label: "Memory", value: 7.2, max: 8, foreground: Colour.Yellow, rest: Colour.Blue }),
      ],
    },
    {
      component: "ProgressList",
      title: "Downloads under way",
      build: () =>
        h(ProgressList, {
          items: [
            { label: "Map tiles", value: 45, max: 120, startedMs: 0 },
            { label: "Photos", value: 300, max: 400, startedMs: 0 },
            { label: "Backup", value: 0, max: 900 },
          ],
        }),
      act: (page) => {
        page.runUntil(30_000);
      },
    },
    {
      component: "TaskList",
      title: "Each state, one failed",
      build: () =>
        h(TaskList, {
          tasks: [
            { label: "Check the disk", status: "done" },
            { label: "Download the update", status: "failed", reason: "The server did not answer" },
            { label: "Download from the mirror", status: "running" },
            { label: "Install", status: "pending" },
          ],
        }),
    },
    {
      component: "Spinner",
      title: "Each style",
      build: () => [
        h(Spinner, { key: "orbit", label: "Orbit: tuning", style: "orbit" }),
        h(Spinner, { key: "bounce", label: "Bounce: searching", style: "bounce", foreground: Colour.Yellow }),
        h(Spinner, { key: "fill", label: "Fill: saving", style: "fill", foreground: Colour.Green }),
        h(Spinner, { key: "dots", label: "Dots: thinking", style: "dots" }),
        h(Spinner, { key: "done", label: "Done: saved", done: true }),
      ],
    },
    {
      component: "Skeleton",
      title: "Ragged lines, and shimmering",
      build: () => [
        h(Skeleton, { key: "ragged", rows: 4, widths: [34, 30, 36, 18] }),
        h(Skeleton, { key: "shimmer", rows: 2, shimmer: true, band: Colour.White, foreground: Colour.Blue }),
      ],
      act: (page) => {
        page.runUntil(1_000);
      },
    },
    {
      component: "Loading",
      title: "A spinner or a skeleton in its place",
      build: () => [
        h(Loading, { key: "weather", loading: true, label: "Fetching the weather" }, h(Notice, { kind: "info", text: "Sunny, 21C" })),
        h(Loading, { key: "news", loading: true, skeleton: { rows: 3, widths: [30, 26, 12] } }, h(Notice, { kind: "info", text: "The headlines" })),
      ],
    },
    {
      component: "MetricCard",
      title: "Large with its history, and on a line",
      build: () => [
        h(MetricCard, {
          key: "viewers",
          label: "Viewers",
          value: 1284,
          previous: 1190,
          kind: "success",
          big: true,
          history: [610, 640, 700, 690, 760, 820, 900, 880, 950, 1010, 1100, 1060, 1190, 1240, 1284],
          historyRows: 2,
        }),
        h(MetricCard, { key: "latency", label: "Latency", value: 182.4, previous: 140.1, kind: "warning", unit: " ms", decimals: 1 }),
        h(MetricCard, { key: "errors", label: "Errors", value: 3.2, previous: 0.4, kind: "error", unit: "%", decimals: 1 }),
      ],
    },
    {
      component: "Notice",
      title: "Each kind",
      build: () => [
        h(Notice, { key: "info", kind: "info", text: "Pages update every minute" }),
        h(Notice, { key: "success", kind: "success", text: "Your vote was counted" }),
        h(Notice, { key: "warning", kind: "warning", text: "The feed is running late" }),
        h(Notice, { key: "error", kind: "error", text: "The scores could not be fetched" }),
      ],
    },
    {
      component: "ToastShelf",
      title: "A toast that can be undone",
      build: () => {
        class DeleteButton extends Component {
          override render(): Child {
            return h(Button, {
              label: "Delete the draft",
              onPress: (session) => {
                this.services.bus.emit("toast", { text: "Draft deleted", kind: "success", undo: () => {} }, { session });
              },
            });
          }
        }
        return [h(DeleteButton, { key: "delete" }), h(ToastShelf, { key: "toasts", forMs: 6_000 })];
      },
      act: (page) => {
        page.press(1, Key.Enter);
      },
    },
    {
      component: "AudioPlayer",
      title: "Tracks before playing",
      build: () =>
        h(AudioPlayer, {
          tracks: ["The morning briefing", "Science weekly", "Gardeners' hour", "Late night jazz"].map((name) => {
            const samples = new Int16Array(16_000 * 300);
            return { name, source: () => ({ name, rate: 16_000, samples: () => samples, complete: true, failure: null, expected: samples.length }) };
          }),
          shown: 4,
        }),
    },
    {
      component: "AudioPlayer",
      title: "Faster, looping, with a sleep timer",
      build: () =>
        h(AudioPlayer, {
          tracks: ["The morning briefing", "Science weekly", "Gardeners' hour"].map((name) => {
            const samples = new Int16Array(16_000 * 300);
            return { name, source: () => ({ name, rate: 16_000, samples: () => samples, complete: true, failure: null, expected: samples.length }) };
          }),
          shown: 3,
        }),
      act: (page) => {
        page.press(1, "p");
        page.press(1, "]");
        page.runUntil(40_000);
        page.press(1, "l");
        page.runUntil(70_000);
        page.press(1, "l");
        page.press(1, "t");
      },
    },
    {
      component: "AudioPlayer",
      title: "With a spectrum",
      build: () =>
        h(AudioPlayer, {
          tracks: [220, 330, 440].map((hertz) => {
            const name = `Test tone, ${hertz} Hz`;
            const samples = tone(hertz, 60_000, "square", 0.5);
            return { name, source: () => ({ name, rate: RATE, samples: () => samples, complete: true, failure: null, expected: samples.length }) };
          }),
          shown: 3,
          spectrum: 3,
        }),
      act: (page) => {
        page.press(1, "p");
        page.runUntil(5_000);
      },
    },
    {
      component: "NowPlaying",
      title: "Over a player, paused",
      build: () => [
        h(NowPlaying, { key: "now", foreground: Colour.Yellow }),
        h(AudioPlayer, {
          key: "player",
          tracks: ["Science weekly", "Gardeners' hour"].map((name) => {
            const samples = new Int16Array(16_000 * 300);
            return { name, source: () => ({ name, rate: 16_000, samples: () => samples, complete: true, failure: null, expected: samples.length }) };
          }),
          shown: 2,
        }),
      ],
      act: (page) => {
        page.press(1, "p");
        page.runUntil(83_000);
        page.press(1, "p");
        page.runUntil(84_000);
      },
    },
    {
      component: "ListeningView",
      title: "Playing, and failing",
      build: () => [
        h(ListeningView, { key: "playing", listening: { name: "Radio 4", heardMs: 754_000, lengthMs: 1_800_000, state: "playing", failure: null, gain: 100 } }),
        h(ListeningView, { key: "failed", listening: { name: "Commentary", heardMs: 0, lengthMs: null, state: "failed", failure: "Not found", gain: 100 } }),
      ],
    },
    {
      component: "PlayQueue",
      title: "The second track playing",
      build: () =>
        h(PlayQueue, {
          tracks: ["Overture", "First movement", "Second movement", "Finale"].map((name) => ({
            name,
            source: () => ({ name, rate: 16_000, samples: () => new Int16Array(0), complete: true, failure: null, expected: 0 }),
          })),
          queue: [0, 1, 2, 3],
          current: 1,
          shown: 4,
          onChoose: () => {},
        }),
    },
    {
      component: "PlayerStatus",
      title: "Every mode set",
      build: () => h(PlayerStatus, { gain: 80, muted: false, repeat: "all", shuffle: true, speed: 1.25, loopFrom: 61_000, loopTo: 95_000, sleepMinutes: 30 }),
    },
    {
      component: "Transport",
      title: "Playing, with no tracks to step through",
      build: () =>
        h(Transport, {
          going: true,
          canPlay: true,
          canStop: true,
          canStep: false,
          onPrevious: () => {},
          onPlayPause: () => {},
          onStop: () => {},
          onNext: () => {},
        }),
    },
    {
      component: "PlayerView",
      title: "Of a stream, with no tracks",
      build: () =>
        h(PlayerView, {
          listening: { name: "Late night jazz", heardMs: 125_000, lengthMs: 412_000, state: "paused", failure: null, gain: 60 },
          queue: [],
          current: null,
          shown: 0,
          levels: [0.3, 0.6, 0.9, 0.8, 0.7, 0.5, 0.6, 0.4, 0.5, 0.3, 0.4, 0.2, 0.3, 0.2, 0.1, 0.1],
          spectrumRows: 2,
          status: { gain: 60, muted: true },
          onPrevious: () => {},
          onPlayPause: () => {},
          onStop: () => {},
          onNext: () => {},
          onSeek: () => {},
          onChoose: () => {},
          onMove: () => {},
        }),
    },
  ],
};
