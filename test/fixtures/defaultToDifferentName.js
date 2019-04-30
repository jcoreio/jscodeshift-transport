exports.input = `
import foo from 'foo'
`

exports.replacements = [[`import foo from 'foo'`, `import {bar} from 'foo'`]]

exports.output = `
import {bar} from 'foo'
`
