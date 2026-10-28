# Common props

The props interfaces that components' props extend: what every control, every control with a value, and the like, takes.

## ControlProps

| Prop | Type | What it is |
| --- | --- | --- |
| `label` | `string` | What it is, in a column of its own to its left; no column when absent. |
| `labelCells` | `number` | The label's column; LABEL_CELLS when absent. |
| `disabled` | `boolean` | It cannot be used: drawn in the disabled look, and it never takes the keys. |
| `sounds` | `ControlSounds` | What it plays to the viewer; silence when absent. |
| `shared` | `boolean` | One copy for every viewer: what one does, all see. |
| `hint` | `string` | What its keys do, for the frame's row 23; the control's own when absent. |
| `autoFocus` | `boolean` | It takes the keys when it arrives, as a dialog's field or a newly chosen tab's list does. |

## Framing

| Prop | Type | What it is |
| --- | --- | --- |
| `background` (needed) | `Colour` |  |
| `foreground` | `Colour` |  |
| `prompts` (needed) | `Prompts` |  |
| `index` | `number` |  |

## SubPageProps

| Prop | Type | What it is |
| --- | --- | --- |
| `fastext` | `FastextLinks` | The four Fastext links, red, green, yellow and cyan, each a page or null; none when absent. |
| `index` | `number` | The page the Index key goes to; none when absent. |

## ValueProps

| Prop | Type | What it is |
| --- | --- | --- |
| `value` | `T` | The value, kept by the parent: the control shows it and reports changes, and the parent sets it again. |
| `initial` | `T` | The value to begin with, when the control keeps its own. |
| `onChange` | `(value: T, session: number) => void` | Called with each value the viewer gives it, whether or not it passes validate. |
| `validate` | `(value: T) => string \| null` | What is wrong with a value, or null. |

And the props of [`ControlProps`](common.md#controlprops).
