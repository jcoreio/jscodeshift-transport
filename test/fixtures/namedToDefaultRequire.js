exports.input = `
const a = require('foo').foo
const {foo: b} = require('foo')
`

exports.replacements = [[`import {foo} from 'foo'`, `import foo from 'bar'`]]

exports.output = `
const a = require('foo').default
const {default: b} = require('foo')
`
