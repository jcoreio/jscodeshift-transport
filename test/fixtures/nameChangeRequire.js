exports.input = `
const {foo} = require('foo')
`

exports.replacements = [[`import {foo} from 'foo'`, `import {bar} from 'foo'`]]

exports.output = `
const {bar: foo} = require('foo')
`
