// The server's channel protocol (neoteletext-server-ts-protocol), one place for
// the library to import it from.

export * from "neoteletext-server-ts-protocol";
// The protocol's own types, generated from the server's schema, that the library names.
export type {
  PageRule,
  RectDeclaration,
  RuleCondition,
  RuleTable,
  RuleTarget,
  ServerMessageRulesFault,
  StateRefusal,
  TextLevel,
  TextRun,
} from "neoteletext-server-ts-protocol/protocol";
