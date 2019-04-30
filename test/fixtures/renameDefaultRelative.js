exports.input = `
import foo from 'foo'
foo.hello()
function test(foo) {
  foo.hello()
}
`

exports.replacements = [[`import foo from 'foo'`, `import bar from './bar'`]]

exports.output = `
import bar from './test/bar'
bar.hello()
function test(foo) {
  foo.hello()
}
`
