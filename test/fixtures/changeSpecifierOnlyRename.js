exports.input = `
import {foo, bar} from 'foo'
foo.hello()
function test(foo) {
  foo.hell()
}
const qux = 2
`

exports.replacements = [
  [`import {foo} from 'foo'`, `import {baz} from 'foo'`],
  [`import {bar} from 'foo'`, `import {qux} from 'foo'`],
]

exports.output = `
import {baz, qux as bar} from 'foo'
baz.hello()
function test(foo) {
  foo.hell()
}
const qux = 2
`
