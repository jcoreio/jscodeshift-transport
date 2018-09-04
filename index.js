const j = require('jscodeshift')
const path = require('path')

module.exports = function replaceSourcesTransform(fileInfo, api, {find, replace}) {
  if (!find) throw new Error('missing find option, pass --find=<VALUE>')
  if (!replace) throw new Error('missing find option, pass --replace=<VALUE>')
  const root = api.jscodeshift(fileInfo.source)
  replaceSources(fileInfo.path, root, find, replace)
  return root.toSource()
}
module.exports.parser = 'babylon'

function findAbsoluteImports(root, source) {
  return root.find(j.ImportDeclaration, {source: {value: source}})
}

const isTrueRequire = path => path.scope.getBindings().require == null

function findAbsoluteRequires(root, source) {
  return root.find(j.CallExpression, {
    callee: {name: 'require'},
    arguments: [{type: 'StringLiteral', value: source}],
  }).filter(isTrueRequire)
}

function findRelativeImports(file, root, sourcePath) {
  const absolutePath = path.resolve(sourcePath)
  return root.find(j.ImportDeclaration, node =>
    path.resolve(path.dirname(file), node.source.value) === absolutePath
  )
}

function findRelativeRequires(file, root, sourcePath) {
  const absolutePath = path.resolve(sourcePath)
  return root.find(j.CallExpression, {
    callee: {name: 'require'},
    arguments: [{type: 'StringLiteral'}],
  }).filter(nodePath => {
    const {node: {arguments: [{value}]}} = nodePath
    return isTrueRequire(nodePath) && path.resolve(path.dirname(file), value) === absolutePath
  })
}

function replaceSources(file, root, find, replace) {
  if (typeof replace === 'string') {
    const target = replace.startsWith('.')
      ? path.relative(path.dirname(file), path.resolve(replace)).replace(/^(?!\.)/, './')
      : replace
    replace = () => target
  }

  function processImport(nodePath) {
    const {node} = nodePath
    const {source: {value: source}} = node
    const replacement = replace({file, path: nodePath, source})
    if (typeof replacement === 'string') node.source.value = replacement
  }

  function processRequire(nodePath) {
    const {node} = nodePath
    const [{value: source}] = node.arguments
    const replacement = replace({file, path: nodePath, source})
    if (typeof replacement === 'string') node.arguments[0].value = replacement
  }

  if (find.startsWith('.')) {
    findRelativeImports(file, root, find).forEach(processImport)
    findRelativeRequires(file, root, find).forEach(processRequire)
  } else {
    findAbsoluteImports(root, find).forEach(processImport)
    findAbsoluteRequires(root, find).forEach(processRequire)
  }
}

module.exports.replaceSources = replaceSources
