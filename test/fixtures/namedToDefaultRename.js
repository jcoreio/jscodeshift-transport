exports.input = `
import {foo} from 'foo'
foo.hello()
function bar(foo) {
  foo.hello()
}
`

exports.replacements = [[`import {foo} from 'foo'`, `import bar from 'bar'`]]

exports.output = `
import bar as foo from 'bar'
foo.hello()
function bar(foo) {
  foo.hello()
}
`
