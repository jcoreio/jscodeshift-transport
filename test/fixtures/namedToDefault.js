exports.input = `
import {foo} from 'foo'
`

exports.replacements = [[`import {foo} from 'foo'`, `import foo from 'bar'`]]

exports.output = `
import foo from 'bar'
`
