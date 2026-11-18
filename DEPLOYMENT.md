# Deploying neoteletext-server-ts-ui-components

A library is deployed by releasing it. Nothing of this repository runs on
a host by itself: a release reaches the deploy host inside the programs
that use it.

## Release

Raise `version` in `package.json` (semantic versioning: a change to what
`exports` names is a new major version) and commit, then:

    scripts/release.sh

On a clean tree it runs the checks and the build, packs
`tmp/release/neoteletext-server-ts-ui-components-<version>.tgz` and tags the
commit `v<version>`. A version already tagged is refused.

The release is built against the protocol release in `vendor/`, which
the peer dependency names. A consumer installs that protocol release
beside this one.

## Into the programs that use it

neoteletext-server-channels (kitchensink) and
neoteletext-server-channel-hackaday commit the release under their own
`vendor/`, beside the protocol release it was built against:

    cp tmp/release/neoteletext-server-ts-ui-components-<version>.tgz <consumer>/vendor/
    git -C <consumer> rm vendor/neoteletext-server-ts-ui-components-<old version>.tgz
    cd <consumer> && npm install --save-exact ./vendor/neoteletext-server-ts-ui-components-<version>.tgz

`package.json` then names `file:vendor/<the file>`, and the lockfile pins
its checksum. The consumer's gates run, and it commits. A new major
version may change what a consumer's code calls: the consumer is moved to
it in the same commit.

The package exports `neoteletext-server-ts-ui-components`; nothing else.

## To the host

What a channel's entry in the server's `channels.json` says for
`default_rules` goes with what the channel says for `ruleTables` in its
`ComponentChannel` options:

| The channel's `ruleTables` | The entry's `default_rules` | What a viewer's browser sends |
| --- | --- | --- |
| `"components"`, or absent | `"none"`, or absent | What each sub-page's components take, and the keys the kit selects pages by: the library sends each sub-page's rule table itself. `"send_all"` gives the same, since the server's default table is only for a page the program gave no table. |
| `"none"` | `"send_all"` | Everything, as on release 23.0.0: the library sends no table, so every page has the server's default table. |
| `"none"` | `"none"`, or absent | Nothing: no page has a table. The channel cannot be used. |

A channel that is to behave exactly as it did on 23.0.0 says
`ruleTables: "none"` and keeps `"default_rules": "send_all"`. It moves to
`"components"` when its pages have been tried under their own tables.

A channel on the library sends its sound as Opus, encoded by ffmpeg with
libopus (`ffmpeg -encoders` lists `libopus`): the host has it on the
path, or the channel gives `ComponentChannel` an `opus` encoder of its
own.

teletext-server's `scripts/deploy.sh` copies neoteletext-server-channels
to the host and runs `npm ci --omit=dev` there, which installs the
release from its `vendor/`. That repository's `DEPLOYMENT.md` has the
rest; neoteletext-server-channel-hackaday's `DEPLOYMENT.md` has its own.
