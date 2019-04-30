exports.input = `
import {foo, bar} from 'foo'
`

exports.replacements = [[`import {foo} from 'foo'`, `import {baz} from 'foo'`]]

exports.output = `
import {baz, bar} from 'foo'
`
