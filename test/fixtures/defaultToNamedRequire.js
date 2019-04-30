exports.input = `
const a = require('foo')
const b = require('foo').default
const {default: b} = require('foo')
`

exports.replacements = [[`import foo from 'foo'`, `import {foo} from 'foo'`]]

exports.output = `
const a = require('foo').foo
const b = require('foo').foo
const {foo: b} = require('foo')
`
