exports.input = `
import foo from 'foo'
`

exports.replacements = [[`import foo from 'foo'`, `import {foo} from 'foo'`]]

exports.output = `
import {foo} from 'foo'
`
