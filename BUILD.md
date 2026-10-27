# Building neottx-server-ts-ui-components

The source is TypeScript that Node runs as it is, by stripping its types
(Node 22.18 and later), so the tests run the source. A release is built:
Node strips no types from a package installed under `node_modules`, so a
consumer takes the JavaScript and declarations in `dist/`.

## What is needed

- **Node 22.18 or later.** `scripts/check.sh` refuses an older one.
- **TypeScript 7.0.2**, the latest release, and the quality tools (oxlint
  with oxlint-tsgolint, Prettier, Knip), all pinned in `package-lock.json`.
- **The protocol**, neottx-server-ts-protocol, as its release in
  `vendor/`: a peer dependency, which a consumer installs beside this
  library, and a development dependency here, for the tests.

## Check

    scripts/check.sh stage    # the locked tools, the type check, formatting,
                              # lint and Knip, the tests
    scripts/check.sh build    # the release build into dist/

The git hooks (`git config core.hooksPath .githooks`) run
`scripts/check.sh commit` on commit and `scripts/check.sh full` on push:
the stage, the build, and the stage again on the Linux host. A hook is
never bypassed.

## A new release of the protocol

Copy its `.tgz` into `vendor/`, remove the old one, and run
`npm install --save-dev --save-exact ./vendor/<the file>`; set the peer
dependency to its version.

## Release and deploy

`DEPLOYMENT.md`: the release, and how it reaches the programs that use it
and the host they run on.
