# Deploying neottx-server-ts-ui-components

A library is deployed by releasing it. Nothing of this repository runs on
a host by itself: a release reaches the deploy host inside the programs
that use it.

## Release

Raise `version` in `package.json` (semantic versioning: a change to what
`exports` names is a new major version) and commit, then:

    scripts/release.sh

On a clean tree it runs the checks and the build, packs
`tmp/release/neottx-server-ts-ui-components-<version>.tgz` and tags the
commit `v<version>`. A version already tagged is refused.

The release is built against the protocol release in `vendor/`, which
the peer dependency names. A consumer installs that protocol release
beside this one.

## Into the programs that use it

neoteletext-server-channels (kitchensink) and
neoteletext-server-channel-hackaday commit the release under their own
`vendor/`, beside the protocol release it was built against:

    cp tmp/release/neottx-server-ts-ui-components-<version>.tgz <consumer>/vendor/
    git -C <consumer> rm vendor/neottx-server-ts-ui-components-<old version>.tgz
    cd <consumer> && npm install --save-exact ./vendor/neottx-server-ts-ui-components-<version>.tgz

`package.json` then names `file:vendor/<the file>`, and the lockfile pins
its checksum. The consumer's gates run, and it commits. A new major
version may change what a consumer's code calls: the consumer is moved to
it in the same commit.

The package exports `neottx-server-ts-ui-components`; nothing else.

## To the host

teletext-server's `scripts/deploy.sh` copies neoteletext-server-channels
to the host and runs `npm ci --omit=dev` there, which installs the
release from its `vendor/`. That repository's `DEPLOYMENT.md` has the
rest; neoteletext-server-channel-hackaday's `DEPLOYMENT.md` has its own.
