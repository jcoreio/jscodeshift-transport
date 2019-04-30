exports.input = `
import foo from 'foo'
import {barness} from './test/bar'
foo.hello()
function test(foo) {
  foo.hello()
}
`

exports.replacements = [[`import foo from 'foo'`, `import bar from './bar'`]]

exports.output = `
import bar, {barness} from './test/bar'
bar.hello()
function test(foo) {
  foo.hello()
}
`
