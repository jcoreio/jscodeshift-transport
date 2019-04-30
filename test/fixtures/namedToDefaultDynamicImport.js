exports.input = `
async () => {
  const a = (await import('foo')).foo
  const {foo: b} = await import('foo')
}
`

exports.replacements = [[`import {foo} from 'foo'`, `import foo from 'bar'`]]

exports.output = `
async () => {
  const a = (await import('foo')).default
  const {default: b} = await import('foo')
}
`
