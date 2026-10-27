// The NeoTeletext component library: class components for teletext
// channels, as React's are for the web, over the reference kit
// (teletext-server's docs/applications.md section 5). A channel imports
// everything from here.
//
//   core/         elements, components, the canvas, controls and their rollover
//                 colours, mounts, the runtime, sound
//   layout/       rows, columns, places, layers, gaps, grids, panels, rules
//   frame/        the page frame: title band, hint, Fastext, status bar, key help
//   text/         styles, news, lines, rich text, badges
//   navigation/   tabs, breadcrumbs, pagination, menus, trees, collapsibles
//   lists/        scrolling, choosing, numbered rows, tables, logs
//   input/        actions, text fields, buttons, check boxes, radios, switches,
//                 sliders, numbers, selects, autocomplete, forms
//   feedback/     progress, gauges, spinners, notices, toasts
//   overlay/      dialogs
//   charts/       bars, columns, sparklines, line charts, heat maps
//   time/         dates as text, large digits, clocks, countdowns, calendars
//   graphics/     mosaics, icons, pictures, painting, sprites, a wheel
//   documents/    pages of several sub-pages
//   interactive/  quizzes, polls, sound lists
//   composition/  wizards
//   games/        roulette, snake

export { BarChart, barHint } from "./charts/bar-chart.ts";
export type { BarChartProps, ChartRow } from "./charts/bar-chart.ts";
export { Bar } from "./charts/bar.ts";
export type { BarProps } from "./charts/bar.ts";
export { ColumnChart } from "./charts/column-chart.ts";
export type { ColumnChartProps } from "./charts/column-chart.ts";
export { Heatmap } from "./charts/heatmap.ts";
export type { HeatmapProps, HeatRow } from "./charts/heatmap.ts";
export { LineChart } from "./charts/line-chart.ts";
export type { LineChartProps } from "./charts/line-chart.ts";
export { ScatterPlot } from "./charts/scatter-plot.ts";
export type { ScatterPlotProps } from "./charts/scatter-plot.ts";
export { Sparkline } from "./charts/sparkline.ts";
export type { SparklineProps } from "./charts/sparkline.ts";

export { Wizard } from "./composition/wizard.ts";
export type { WizardProps } from "./composition/wizard.ts";

export { EventBus, reaches } from "./core/bus.ts";
export type { Audience, Bus, Place, Unsubscribe } from "./core/bus.ts";
export { Canvas, CHIP_CELLS, NEW_BACKGROUND_CELL, nothingDeclared } from "./core/canvas.ts";
export type { Declared, PageRequests, Region } from "./core/canvas.ts";
export type { ComponentEvent, ComponentEventInit, Origin } from "./core/component-events.ts";
export { Component, stack, stackSize } from "./core/component.ts";
export type { Box, ComponentHost, LayoutChild, Size, TimerOptions } from "./core/component.ts";
export {
  controlLines,
  controlTriplet,
  controlTriplets,
  enhancementLines,
  FIRST_CONTROL_ROW,
  keptControls,
  keptDeclarations,
  LAST_CONTROL_ROW,
  MAX_CONTROLS,
  MAX_POINTER_AREAS,
  NO_POINTER_AREAS,
  packedLine,
  pointerAreaTriplet,
  setActivePosition,
  TERMINATION,
  triplet,
  WHOLE_PAGE_POINTER_AREA,
} from "./core/controls.ts";
export { readControls, readDeclarations } from "./core/read-controls.ts";
export type { Kept, PointerAreas } from "./core/controls.ts";
export type { Declarations } from "./core/read-controls.ts";
export { flatten, h, isElement } from "./core/element.ts";
export type { AnyComponentClass, Child, ClassProps, ComponentClass, Element, LayoutProps, PropsOf, WithChildren } from "./core/element.ts";
export { isPress, NOTCH, typedText } from "./core/events.ts";
export type { Cell, HoverEvent, KeyEvent, PointerEvent, TextEvent, WheelEvent } from "./core/events.ts";
export { choosing, COLOUR_KEY_NAMES, COLOUR_KEYS, colourKeyOf, digitOf, FUNCTION_KEYS } from "./core/keys.ts";
export type { LibraryEvents, ToastEvent } from "./core/library-events.ts";
export { keepInView, listStep, moveChoice, WheelLines } from "./core/list-cursor.ts";
export {
  CHOSEN,
  DISABLED,
  DISABLED_BAND,
  DISABLED_CHIP,
  EMPTY,
  FOCUSED_LABEL,
  ITEM_TEXT,
  KINDS,
  LABEL,
  LABEL_CELLS,
  MARK,
  paintEmpty,
  paintLabel,
  SELECTED,
} from "./core/look.ts";
export type { ControlLook, Kind } from "./core/look.ts";
export { BOTTOM_ROW, FULL_BLOCK, LEFT_HALF, LOWER_TWO, MIDDLE_ROW, MOSAIC_BASE, RIGHT_HALF, SIXEL, TOP_ROW, UPPER_TWO } from "./core/mosaics.ts";
export { Mount } from "./core/mount.ts";
export type { MountHost } from "./core/mount.ts";
export { probeNeeds } from "./core/needs.ts";
export type { PageNeeds } from "./core/needs.ts";
export { SCREEN, SubPage } from "./core/page.ts";
export type { SubPageLinks, SubPageProps } from "./core/page.ts";
export { RawSubPage } from "./core/raw-sub-page.ts";
export type { RawProps } from "./core/raw-sub-page.ts";
export { LEVEL_1_COLOURS, ROLLOVER_COLOURS, rolloverLine, rolloverTriplets } from "./core/rollover.ts";
export type { ColourTable, Rgb12 } from "./core/rollover.ts";
export { ComponentChannel } from "./core/runtime.ts";
export type { PageSpec } from "./core/page-spec.ts";
export type { PageParams, Services } from "./core/services.ts";
export { noise, RATE, sequence, sound, tone } from "./core/sound.ts";
export type { Sound, Wave } from "./core/sound.ts";
export { BLOCK_SAMPLES, LEAD_MS, MOST_BLOCKS, SECOND_MS, STREAM_CHANNEL, STREAM_HANDLE, TICK_MS, WRAP } from "./core/stream.ts";
export type { Listening, StreamSource } from "./core/stream.ts";
export { cells, CUT_MARK, fit, headline, HEADLINE_CUT, pad, padStart, wrap } from "./core/text.ts";

export { DayPages } from "./documents/day-pages.ts";
export type { Day, DayPagesProps } from "./documents/day-pages.ts";
export { chunks, Document, DOCUMENT_ROWS, partName } from "./documents/document.ts";
export type { Article, DocumentProps } from "./documents/document.ts";
export { QrPanel } from "./documents/qr-panel.ts";
export type { QrPanelProps } from "./documents/qr-panel.ts";
export { StoryPages, TEXT_WIDTH } from "./documents/story-pages.ts";
export type { StoryProps } from "./documents/story-pages.ts";

export { AudioPlayer } from "./feedback/audio-player.ts";
export type { AudioPlayerProps } from "./feedback/audio-player.ts";
export { LineGauge } from "./feedback/line-gauge.ts";
export type { LineGaugeProps } from "./feedback/line-gauge.ts";
export { clockTime, ListeningView } from "./feedback/listening-view.ts";
export type { ListeningViewProps } from "./feedback/listening-view.ts";
export { Notice } from "./feedback/notice.ts";
export type { NoticeProps } from "./feedback/notice.ts";
export { LISTENING_ROWS, LOOK_MS, nothingPlaying, NowPlaying, playing } from "./feedback/now-playing.ts";
export type { NowPlayingProps } from "./feedback/now-playing.ts";
export { GAUGE, ProgressBar } from "./feedback/progress.ts";
export type { ProgressProps, Threshold } from "./feedback/progress.ts";
export { Spinner } from "./feedback/spinner.ts";
export type { SpinnerProps, SpinnerStyle } from "./feedback/spinner.ts";
export { ToastShelf } from "./feedback/toast-shelf.ts";
export type { ToastShelfProps } from "./feedback/toast-shelf.ts";

export { FastextBar, KEY_COLOURS, promptColumns } from "./frame/fastext-bar.ts";
export type { FastextBarProps } from "./frame/fastext-bar.ts";
export { BAND_ROW, BAND_ROWS, BODY_ROW, BODY_ROWS, FASTEXT_ROW, Frame, HINT_ROW } from "./frame/frame.ts";
export type { FrameProps, Prompt, Prompts } from "./frame/frame.ts";
export { HintLine } from "./frame/hint-line.ts";
export type { LineProps } from "./frame/hint-line.ts";
export { KeyHelp } from "./frame/key-help.ts";
export type { KeyHelpEntry, KeyHelpProps } from "./frame/key-help.ts";
export { PositionLine } from "./frame/position-line.ts";
export type { PositionProps } from "./frame/position-line.ts";
export { StatusBar } from "./frame/status-bar.ts";
export type { Segment, StatusBarProps } from "./frame/status-bar.ts";
export { TitleBand } from "./frame/title-band.ts";
export type { TitleBandProps } from "./frame/title-band.ts";

export { Roulette, SPIN_STEPS_MS } from "./games/roulette.ts";
export type { RouletteProps } from "./games/roulette.ts";
export { Snake } from "./games/snake.ts";
export type { SnakeProps } from "./games/snake.ts";

export { Bouncer } from "./graphics/bouncer.ts";
export type { BouncerProps } from "./graphics/bouncer.ts";
export { Icon, ICONS } from "./graphics/icon.ts";
export type { IconName, IconProps } from "./graphics/icon.ts";
export { Mosaic, sixelsOf } from "./graphics/mosaic.ts";
export type { Bitmap, MosaicProps } from "./graphics/mosaic.ts";
export { PaintCanvas } from "./graphics/paint-canvas.ts";
export type { PaintProps } from "./graphics/paint-canvas.ts";
export { Picture } from "./graphics/picture.ts";
export type { PictureProps } from "./graphics/picture.ts";
export { Wheel } from "./graphics/wheel.ts";
export type { WheelProps } from "./graphics/wheel.ts";

export { Action } from "./input/action.ts";
export type { ActionProps } from "./input/action.ts";
export { Autocomplete } from "./input/autocomplete.ts";
export type { AutocompleteProps } from "./input/autocomplete.ts";
export { Button } from "./input/button.ts";
export type { ButtonProps } from "./input/button.ts";
export { CheckboxGroup } from "./input/checkbox-group.ts";
export type { CheckboxGroupProps } from "./input/checkbox-group.ts";
export { Checkbox } from "./input/checkbox.ts";
export type { CheckboxProps, Ticked } from "./input/checkbox.ts";
export { Control } from "./input/control.ts";
export type { ControlProps, ControlSounds } from "./input/control.ts";
export { Field } from "./input/field.ts";
export type { FieldProps } from "./input/field.ts";
export { NumberInput } from "./input/number-input.ts";
export type { NumberInputProps } from "./input/number-input.ts";
export { RadioGroup } from "./input/radio-group.ts";
export type { RadioGroupProps } from "./input/radio-group.ts";
export { Select } from "./input/select.ts";
export type { SelectProps } from "./input/select.ts";
export { Slider } from "./input/slider.ts";
export type { SliderProps } from "./input/slider.ts";
export { Switch } from "./input/switch.ts";
export type { SwitchProps } from "./input/switch.ts";
export { TextField } from "./input/text-field.ts";
export type { TextFieldProps } from "./input/text-field.ts";
export { ValueControl } from "./input/value-control.ts";
export type { ValueProps, ValueState } from "./input/value-control.ts";

export { Poll } from "./interactive/poll.ts";
export type { PollProps } from "./interactive/poll.ts";
export { Quiz } from "./interactive/quiz.ts";
export type { Question, QuizProps } from "./interactive/quiz.ts";
export { SoundList } from "./interactive/sound-list.ts";
export type { SoundListProps } from "./interactive/sound-list.ts";
export { Tally } from "./interactive/tally.ts";

export { At } from "./layout/at.ts";
export type { AtProps } from "./layout/at.ts";
export { Centred } from "./layout/centred.ts";
export { Columns } from "./layout/columns.ts";
export type { ColumnsProps } from "./layout/columns.ts";
export { Gap } from "./layout/gap.ts";
export type { GapProps } from "./layout/gap.ts";
export { Grid } from "./layout/grid.ts";
export type { GridProps } from "./layout/grid.ts";
export { Layers } from "./layout/layers.ts";
export { Rows } from "./layout/layouts.ts";
export { Panel } from "./layout/panel.ts";
export type { PanelProps, PanelStyle } from "./layout/panel.ts";
export { Rule } from "./layout/rule.ts";
export type { RuleProps, RuleStyle } from "./layout/rule.ts";

export { ChoiceList } from "./lists/choice-list.ts";
export type { ChoiceListProps } from "./lists/choice-list.ts";
export { DataTable } from "./lists/data-table.ts";
export type { DataTableProps, TableColumn } from "./lists/data-table.ts";
export { ItemText } from "./lists/item-text.ts";
export type { ItemTextProps } from "./lists/item-text.ts";
export { ListRow } from "./lists/list-row.ts";
export type { ListRowProps, RowLook } from "./lists/list-row.ts";
export { ListRows } from "./lists/list-rows.ts";
export type { ListRowsProps } from "./lists/list-rows.ts";
export { LogView } from "./lists/log-view.ts";
export type { LogEntry, LogLevel, LogViewProps } from "./lists/log-view.ts";
export { NumberedRows } from "./lists/numbered-rows.ts";
export type { NumberedRow, NumberedRowsProps } from "./lists/numbered-rows.ts";
export { BAR_CELLS, ScrollBar, thumb, topAt } from "./lists/scroll.ts";
export type { ScrollBarProps } from "./lists/scroll.ts";
export { ScrollingText } from "./lists/scrolling-text.ts";
export type { ScrollingTextProps } from "./lists/scrolling-text.ts";
export { Table } from "./lists/table.ts";
export type { TableProps } from "./lists/table.ts";
export { ToggleList } from "./lists/toggle-list.ts";
export type { ToggleListProps } from "./lists/toggle-list.ts";

export { Breadcrumbs } from "./navigation/breadcrumbs.ts";
export type { BreadcrumbsProps, Crumb } from "./navigation/breadcrumbs.ts";
export { Collapsible } from "./navigation/collapsible.ts";
export type { CollapsibleProps } from "./navigation/collapsible.ts";
export { Menu } from "./navigation/menu.ts";
export type { MenuItem, MenuProps } from "./navigation/menu.ts";
export { Pagination } from "./navigation/pagination.ts";
export type { PaginationProps, PaginationStyle } from "./navigation/pagination.ts";
export { TabView } from "./navigation/tab-view.ts";
export type { TabViewProps } from "./navigation/tab-view.ts";
export { TabStrip } from "./navigation/tabs.ts";
export type { TabStripProps, TabStyle } from "./navigation/tabs.ts";
export { Tree } from "./navigation/tree.ts";
export type { TreeNode, TreeProps } from "./navigation/tree.ts";

export { Dialog } from "./overlay/dialog.ts";
export type { DialogProps } from "./overlay/dialog.ts";
export { Modal } from "./overlay/modal.ts";
export type { ModalProps } from "./overlay/modal.ts";

export { Badges } from "./text/badge.ts";
export type { BadgeSpec, BadgesProps } from "./text/badge.ts";
export { Band } from "./text/band.ts";
export type { BandProps } from "./text/band.ts";
export { Byline } from "./text/byline.ts";
export type { BylineProps } from "./text/byline.ts";
export { Concealed } from "./text/concealed.ts";
export { DoubleHeight } from "./text/double-height.ts";
export { DoubleWidth } from "./text/double-width.ts";
export { Flashing } from "./text/flashing.ts";
export { articleLines, LinesBlock } from "./text/lines.ts";
export type { Block, Line, LinesProps } from "./text/lines.ts";
export { Headline, HEADLINE_LINES, pageNumber } from "./text/news.ts";
export type { HeadlineProps } from "./text/news.ts";
export { Newsflash } from "./text/newsflash.ts";
export type { NewsflashProps } from "./text/newsflash.ts";
export { PageLink } from "./text/page-link.ts";
export type { PageLinkProps } from "./text/page-link.ts";
export { Paragraph } from "./text/paragraph.ts";
export type { ParagraphProps } from "./text/paragraph.ts";
export { Placeholder } from "./text/placeholder.ts";
export type { PlaceholderProps } from "./text/placeholder.ts";
export { changes, layoutRuns, RichText } from "./text/rich-text.ts";
export type { RichTextProps, Run, RunStyle } from "./text/rich-text.ts";
export { Text } from "./text/styles.ts";
export type { StyledProps, TextProps } from "./text/styles.ts";
export { Ticker } from "./text/ticker.ts";
export type { TickerProps } from "./text/ticker.ts";

export { BIG_ROWS, BigDigits } from "./time/big-digits.ts";
export type { BigDigitsProps } from "./time/big-digits.ts";
export { Calendar } from "./time/calendar.ts";
export type { CalendarDate, CalendarProps } from "./time/calendar.ts";
export { Clock } from "./time/clock.ts";
export type { ClockProps } from "./time/clock.ts";
export { Countdown } from "./time/countdown.ts";
export type { CountdownProps } from "./time/countdown.ts";
export { DATE_FORMATS, dateOf, DateText, formatDate } from "./time/date-text.ts";
export type { DateTextProps, DateValue } from "./time/date-text.ts";
