# neottx-server-ts-ui-components

The NeoTeletext component library: class components for teletext
channels in TypeScript, over the server's channel protocol
(neottx-server-ts-protocol). These rules add to `~/.claude/CLAUDE.md`.

## Working on the code

- **Always leave the code cleaner and better organised than you found
  it.** Each change is a chance to split what does two things, name what
  is unnamed, and delete what is unused.
- **The development process always uses the best-regarded linters and
  code analysis tools**, pinned, with their findings fixed rather than
  silenced. A suppression is narrow, at its site, with its reason.
- **Security is important and is always a factor** in every change: what
  a program reads from the server, its files and the programs it runs is
  untrusted, checked before it is used, and bounded.
- **Always use the latest TypeScript.** Never fall back to an older
  TypeScript to suit a tool: a tool that cannot run on the latest
  TypeScript is replaced, not accommodated.
- **This is a library.** What `package.json`'s `exports` names is its
  whole interface; a change to it is a change of version, and its
  consumers take a release, never its source.
- **The protocol is a release too.** It comes from
  `vendor/neottx-server-ts-protocol-<version>.tgz`, and the peer
  dependency names the version the library is built against.
- **Components are classes. Hooks and function components are never to
  be implemented in this architecture**, on the owner's instruction of
  28 October 2026. A component keeps its state in `state` and changes it
  with `setState`, and its lifecycle is its methods
  (`componentDidMount`, `componentWillUnmount`, …). This overrides the
  global rule's "function components and hooks only" for this library
  and every program built on it.
