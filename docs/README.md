# The library's docs

- [How it works](how-it-works.md): from a component to a viewer's screen,
  and from a viewer's key to a component, through the browser, the
  server and the channel program.
- [Keys and focus](keys-and-focus.md): which component has the keys, the
  way a key goes, and building a page for a remote.
- [The look](look.md): what teletext gives, how state is shown without
  colour alone, how far a thing stands off the page, and the rules a page
  keeps.
- [Sound](audio.md): short sounds, streams, and the audio player.
- [Testing](testing.md): pages under test, snapshots, and the catalogue
  that draws these docs' pictures.
- [Components](components/README.md): every component, by part, with its
  props, its keys, and examples, each its picture and its code.
- [Changes](../CHANGELOG.md): what each release changed, and what to
  change to take it.

The pages under `components/` and the pictures under `images/` are made
from the code (`node test/docs.ts`, `node test/screenshots.ts`); edit
the code and the catalogue, not them.
