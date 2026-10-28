// The graphics part's examples: icons, bitmaps, pictures, a map with places, painting and moving sprites.

import { Bouncer, Columns, h, Icon, MapMarkers, Mosaic, PaintCanvas, Picture, Rows, Text, Wheel } from "../../src/index.ts";
import { Colour } from "../../src/kit.ts";
import type { Part } from "./example.ts";

export const graphics: Part = {
  part: "graphics",
  title: "Graphics",
  about:
    "Pictures in mosaic sixels: icons, bitmaps of your own, pictures and QR codes made by the engine's tools, a map with its places marked, a canvas to paint on, and things that move.",
  examples: [
    {
      component: "Icon",
      title: "The weather",
      build: () =>
        h(
          Columns,
          {},
          h(Rows, { key: "sun" }, h(Icon, { name: "sun" }), h(Text, { text: "sun" })),
          h(Rows, { key: "cloud" }, h(Icon, { name: "cloud" }), h(Text, { text: "cloud" })),
          h(Rows, { key: "rain" }, h(Icon, { name: "rain" }), h(Text, { text: "rain" })),
          h(Rows, { key: "snow" }, h(Icon, { name: "snow" }), h(Text, { text: "snow" })),
          h(Rows, { key: "storm" }, h(Icon, { name: "storm" }), h(Text, { text: "storm" })),
        ),
    },
    {
      component: "Icon",
      title: "Marks and everyday things, in a colour given",
      build: () => [
        h(
          Columns,
          { key: "marks" },
          h(Rows, { key: "tick" }, h(Icon, { name: "tick" }), h(Text, { text: "tick" })),
          h(Rows, { key: "cross" }, h(Icon, { name: "cross" }), h(Text, { text: "cross" })),
          h(Rows, { key: "warning" }, h(Icon, { name: "warning" }), h(Text, { text: "warning" })),
          h(Rows, { key: "info" }, h(Icon, { name: "info" }), h(Text, { text: "info" })),
        ),
        h(
          Columns,
          { key: "things" },
          h(Rows, { key: "heart" }, h(Icon, { name: "heart", foreground: Colour.Red }), h(Text, { text: "heart" })),
          h(Rows, { key: "star" }, h(Icon, { name: "star", foreground: Colour.Cyan }), h(Text, { text: "star" })),
          h(Rows, { key: "home" }, h(Icon, { name: "home", foreground: Colour.Cyan }), h(Text, { text: "home" })),
          h(Rows, { key: "mail" }, h(Icon, { name: "mail", foreground: Colour.Cyan }), h(Text, { text: "mail" })),
        ),
      ],
    },
    {
      component: "Mosaic",
      title: "A bitmap of your own",
      build: () =>
        h(Mosaic, {
          // A television, "#" for each sixel set.
          bitmap: [
            "     #     #",
            "      #   #",
            "       # #",
            "####################",
            "#                  #",
            "#  ############  # #",
            "#  #          #    #",
            "#  #          #  # #",
            "#  #          #    #",
            "#  ############  # #",
            "#                  #",
            "####################",
          ],
          foreground: Colour.Cyan,
        }),
    },
    {
      component: "Picture",
      title: "A QR code from the engine",
      build: () =>
        h(Picture, {
          // What `neottx qr --page 150 HTTPS://NEWS.EXAMPLE/150 qr.tti` wrote: its code is on rows 2 to 11.
          tti: [
            "PN,15000",
            "OL,2,\u001BW\u007F\u007F\u007F\u007F\u007F\u007F\u007F\u007F\u007F\u007F\u007F\u007F\u007F\u007F5",
            "OL,3,\u001BW\u007F\u007Fcssk;/{cssk\u007F5",
            "OL,4,\u001BW\u007F\u007Fj jjb&kj jj\u007F5",
            "OL,5,\u001BW\u007F\u007Frssz{xjrssz\u007F5",
            "OL,6,\u001BW\u007F\u007Fl,/.np4\u007F(nz\u007F5",
            "OL,7,\u001BW\u007F\u007Fv|\u007F{fd 4x?\u007F\u007F5",
            "OL,8,\u001BW\u007F\u007Fh,lj5ug#49\u007F\u007F5",
            'OL,9,\u001BW\u007F\u007Fjpzj"x,98}\u007F\u007F5',
            "OL,10,\u001BW\u007F\u007F|||~|~||}|\u007F\u007F5",
            "OL,11,\u001BW//////////////%",
          ].join("\n"),
          firstRow: 2,
        }),
    },
    {
      component: "MapMarkers",
      title: "Towns of Sicily",
      build: () =>
        h(MapMarkers, {
          map: {
            // The island, a sixel to about ten kilometres: west to east 12.35 to 15.75 degrees, north to south 38.35 to 36.6.
            bitmap: [
              "",
              "                            #",
              "   #    #                ###",
              "  ### ###             ######",
              " ##########  ##############",
              " ##########################",
              " #########################",
              " #########################",
              " #########################",
              "  #######################",
              "    #####################",
              "      ##################",
              "        ################",
              "         ################",
              "          ###############",
              "            #############",
              "             #############",
              "                ##########",
              "                  ########",
              "                   ######",
              "                    #####",
              "                     ####",
              "                       ##",
              "",
            ],
            foreground: Colour.Green,
          },
          bounds: { north: 38.35, south: 36.6, west: 12.35, east: 15.75 },
          places: [
            { name: "Palermo", latitude: 38.12, longitude: 13.36 },
            { name: "Messina", latitude: 38.19, longitude: 15.55 },
            { name: "Catania", latitude: 37.5, longitude: 15.09 },
            { name: "Syracuse", latitude: 37.08, longitude: 15.29 },
            { name: "Agrigento", latitude: 37.31, longitude: 13.58, foreground: Colour.Cyan },
            { name: "Trapani", latitude: 38.02, longitude: 12.51 },
            { name: "Malta", latitude: 35.9, longitude: 14.51 },
          ],
        }),
    },
    {
      component: "PaintCanvas",
      title: "A stroke painted, the brush over it",
      build: () => h(PaintCanvas, { columns: 30, rows: 8, foreground: Colour.Yellow, brush: true }),
      act: (page) => {
        // A wave, a cell at a time: the pointer pressed, dragged and let go.
        page.mouse(1, "press", 0, 2, 5);
        for (let column = 3; column <= 26; column += 1) {
          page.move(1, 1, column, 7 - Math.round(3 * Math.sin(column / 3)));
        }
        page.mouse(1, "release", 0, 26, 9);
        page.move(1, 0, 29, 9);
      },
    },
    {
      component: "Wheel",
      title: "A segment lit",
      build: () => h(Wheel, { lit: 4 }),
    },
    {
      component: "Wheel",
      title: "Fewer segments",
      build: () => h(Wheel, { lit: 0, segments: 6 }),
    },
    {
      component: "Bouncer",
      title: "A ball mid-bounce",
      build: () => h(Bouncer, { everyMs: 100 }),
      act: (page) => {
        page.runUntil(2_300);
      },
    },
  ],
};
