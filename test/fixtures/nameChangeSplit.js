exports.input = `
import {foo, bar} from 'foo'
`

exports.replacements = [[`import {foo} from 'foo'`, `import {bar} from 'baz'`]]

exports.output = `
import {bar} from 'foo'
import {bar as foo} from 'baz'
`
