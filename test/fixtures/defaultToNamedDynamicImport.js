exports.input = `
async () => {
  const a = (await import('foo')).default
  const {default: b} = await import('foo')
}
`

exports.replacements = [[`import foo from 'foo'`, `import {bar} from 'foo'`]]

exports.output = `
async () => {
  const a = (await import('foo')).bar
  const {bar: b} = await import('foo')
}
`
