# jscodeshift-transport

[![Build Status](https://travis-ci.org/jcoreio/jscodeshift-transport.svg?branch=master)](https://travis-ci.org/jcoreio/jscodeshift-transport)
[![Coverage Status](https://codecov.io/gh/jcoreio/jscodeshift-transport/branch/master/graph/badge.svg)](https://codecov.io/gh/jcoreio/jscodeshift-transport)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

A great jscodeshift transform and API for finding and replacing module names in
import/require statements.  I wrote this because other transforms I found seemed
not as convenient or comprehensive.  This handles both relative imports/requires
and imports/requires from `node_modules`.  For instance, it's easy to replace a
component from a library with your own wrapper in a local file:

```sh
jscodeshift -t ~/jscodeshift-transport ./src \
  --find=@material-ui/core/Button \
  --replace=./src/components/Button
```

The correct relative path will be used in each replacement, relative to the file
being processed.  It will work just as well if you swap the `--find` and
`--replace` values, restoring the original module names.

## `require`s it's not magic enough to handle
* scopes where `require` is redeclared, e.g. requires inside a
  `function (require) { ... }` will be ignored, if you're doing that,
  *please stahp*
* computed require paths (any argument besides a string literal)

## CLI

Run `index.js` in this repo with `jscodeshift` and pass two options to it:

* `--find=<VALUE>`: The module name to find, just like you would use in an
  `import` or `require` statement, relative to the current working directory:
  Paths to local files must be absolute or begin with ../ or ./; otherwise,
  it is assumed you meant an import from `node_modules`.
* `--replace=<VALUE>`: The module name to replace it with, just like you would
  use in an `import` or `require` statement, relative to the current working directory:
  Paths to local files must be absolute or begin with ../ or ./; otherwise,
  it is assumed you meant an import from `node_modules`.

```sh
npm i -g jscodeshift
cd ~
git clone https://github.com/jcoreio/jscodeshift-transport
cd ~/jscodeshift-transport
npm i
cd ~/path/to/your/project
jscodeshift -t ~/jscodeshift-transport ./src \
  --find=@material-ui/core/Button \
  --replace=./src/components/Button
```

## API

`jscodeshift-transport` exports a `replaceModuleNames` function you can use in your
own jscodeshift transforms.

```js
const {replaceModuleNames} = require('jscodeshift-transport')
```

It accepts the following arguments:

### `file: string`

The path to the file being transformed

### `root: Collection`

The root jscodeshift `Collection` from the source code of `file`.  You must use
the `babylon` parser (e.g. `require('jscodeshift').withParser('babylon')(code)`)

### `find: string`

The module name to find in `import`/`require` statements.
Paths starting with `./` or `../` are treated as relative
**to the current working directory**, not `file`.

### `replace: string | (ReplaceOptions) => ?string`

The module name to replace `find` with in `import`/`require` statements, or a
function that computes the replacement.  Paths starting with `./` or `../`
are treated as relative **to the current working directory**, not `file`.  If
you pass a function, it is called with a `ReplacementOptions` object containing
the following properties, and may return a `string` replacement module name.

#### `moduleName: string`

The module name in an `import/require` statement to replace.  It may differ from
`find` if it is a relative path from a different directory to the same file.

#### `file: string`

The `file` you passed to `replaceSources`.

#### `path: NodePath`

The `babel` `NodePath` for the `import` or `require` statement.
