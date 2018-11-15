const j = require('jscodeshift')
const path = require('path')

module.exports = function replaceModuleNamesTransform(
  fileInfo,
  api,
  { find, replace, regex, flags }
) {
  if (!find) throw new Error('missing find option, pass --find=<VALUE>')
  if (!replace)
    throw new Error('missing replace option, pass --replace=<VALUE>')
  if (regex) find = new RegExp(find, flags || '')
  const root = api.jscodeshift(fileInfo.source)
  replaceModuleNames(fileInfo.path, root, find, replace)
  return root.toSource()
}
module.exports.parser = 'babylon'

function findAbsoluteImports(root, moduleName) {
  return root.find(j.ImportDeclaration, { source: { value: moduleName } })
}

function findAbsoluteAsyncImports(root, moduleName) {
  return root.find(j.CallExpression, {
    callee: { type: 'Import' },
    arguments: [{ type: 'StringLiteral', value: moduleName }],
  })
}

const isTrueRequire = path => path.scope && path.scope.lookup('require') == null

function findAbsoluteRequires(root, moduleName) {
  return root
    .find(j.CallExpression, {
      callee: { name: 'require' },
      arguments: [{ type: 'StringLiteral', value: moduleName }],
    })
    .filter(isTrueRequire)
}

function findRelativeImports(file, root, moduleName) {
  const absolutePath = path.resolve(moduleName)
  return root.find(
    j.ImportDeclaration,
    node => path.resolve(path.dirname(file), node.source.value) === absolutePath
  )
}

function findRelativeAsyncImports(file, root, moduleName) {
  const absolutePath = path.resolve(moduleName)
  return root.find(
    j.CallExpression,
    node =>
      node.callee.type === 'Import' &&
      node.arguments[0] &&
      node.arguments[0].type === 'StringLiteral' &&
      path.resolve(path.dirname(file), node.arguments[0].value) === absolutePath
  )
}

function findRelativeRequires(file, root, moduleName) {
  const absolutePath = path.resolve(moduleName)
  return root
    .find(j.CallExpression, {
      callee: { name: 'require' },
      arguments: [{ type: 'StringLiteral' }],
    })
    .filter(nodePath => {
      const {
        node: {
          arguments: [{ value }],
        },
      } = nodePath
      return (
        isTrueRequire(nodePath) &&
        path.resolve(path.dirname(file), value) === absolutePath
      )
    })
}

function replaceModuleNames(file, root, find, replace) {
  if (find instanceof RegExp) {
    const regexp = find
    find = s => regexp.test(s)
    const replacement = replace
    replace = ({ moduleName }) => moduleName.replace(regexp, replacement)
  }
  if (typeof replace === 'string') {
    const target =
      path.isAbsolute(replace) || replace.startsWith('.')
        ? path
            .relative(path.dirname(file), path.resolve(replace))
            .replace(/^(?!\.)/, './')
        : replace
    replace = () => target
  }

  function processImport(nodePath) {
    const { node } = nodePath
    const {
      source: { value: moduleName },
    } = node
    const replacement = replace({ file, path: nodePath, moduleName })
    if (typeof replacement === 'string') node.source.value = replacement
  }

  function processRequireOrAsyncImport(nodePath) {
    const { node } = nodePath
    const [{ value: moduleName }] = node.arguments
    const replacement = replace({ file, path: nodePath, moduleName })
    if (typeof replacement === 'string') node.arguments[0].value = replacement
  }

  if (
    typeof find === 'string' &&
    (path.isAbsolute(find) || find.startsWith('.'))
  ) {
    findRelativeImports(file, root, find).forEach(processImport)
    findRelativeRequires(file, root, find).forEach(processRequireOrAsyncImport)
    findRelativeAsyncImports(file, root, find).forEach(
      processRequireOrAsyncImport
    )
  } else {
    findAbsoluteImports(root, find).forEach(processImport)
    findAbsoluteRequires(root, find).forEach(processRequireOrAsyncImport)
    findAbsoluteAsyncImports(root, find).forEach(processRequireOrAsyncImport)
  }
}

module.exports.replaceModuleNames = replaceModuleNames
