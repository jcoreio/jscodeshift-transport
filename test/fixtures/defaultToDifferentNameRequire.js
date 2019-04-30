exports.input = `
const a = require('foo')
const b = require('foo').default
const {default: c} = require('foo')
`

exports.replacements = [[`import foo from 'foo'`, `import {bar} from 'foo'`]]

exports.output = `
const a = require('foo').bar
const b = require('foo').bar
const {bar: c} = require('foo')
`
