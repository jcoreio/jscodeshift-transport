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

function getImportDeclaration(str) {
  const statements = j(str).find(j.ImportDeclaration)
  if (statements.size() > 1) {
    throw new Error('only one import statement is supported in find/replace')
  } else if (!statements.size()) {
    throw new Error(`invalid import statement: ${str}`)
  }
  const statement = statements.nodes()[0]
  if (statement.specifiers.length > 1) {
    throw new Error(`only one import specifier is supported in find/replace`)
  }
  if (!statement.specifiers.length) {
    throw new Error(
      `you must specify a default or named import in import statements for find/replace`
    )
  }
  return statement
}

function normalizeReplaceSource(file, replace) {
  return path.isAbsolute(replace) || replace.startsWith('.')
    ? path
        .relative(path.dirname(file), path.resolve(replace))
        .replace(/^(?!\.)/, './')
    : replace
}

function replaceModuleNames(file, root, find, replace) {
  if (typeof find === 'string' && /^\s*import\s+/.test(find)) {
    if (typeof replace !== 'string' || !/^\s*import\s+/.test(replace)) {
      throw new Error('if find is an import statement, replace must be also')
    }
    const findStatement = getImportDeclaration(find)
    const replaceStatement = getImportDeclaration(replace)
    return replaceAdvanced(file, root, findStatement, replaceStatement)
  }
  if (find instanceof RegExp) {
    const regexp = find
    find = s => regexp.test(s)
    const replacement = replace
    replace = (moduleName, info) =>
      moduleName.replace(
        regexp,
        typeof replacement === 'function'
          ? (...args) => replacement(...args, info)
          : replacement
      )
  }
  if (typeof replace === 'string') {
    const target = normalizeReplaceSource(file, replace)
    replace = () => target
  }

  function processImport(nodePath) {
    const { node } = nodePath
    const {
      source: { value: moduleName },
    } = node
    const replacement = replace(moduleName, { file, path: nodePath })
    if (typeof replacement === 'string') node.source.value = replacement
  }

  function processRequireOrAsyncImport(nodePath) {
    const { node } = nodePath
    const [{ value: moduleName }] = node.arguments
    const replacement = replace(moduleName, { file, path: nodePath })
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

function replaceAdvanced(file, root, find, replace) {
  const findSpecifier = find.specifiers[0]
  const findSource = find.source.value
  const replaceSpecifier = replace.specifiers[0]
  const replaceSource = normalizeReplaceSource(file, replace.source.value)

  function processImport(nodePath) {
    const { node } = nodePath
    const { specifiers } = node
    const specIndex = specifiers.findIndex(
      s =>
        s.type === findSpecifier.type &&
        (findSpecifier.type === 'ImportDefaultSpecifier' ||
          s.imported.name === findSpecifier.imported.name)
    )
    if (specIndex < 0) return
    const renameBinding =
      findSpecifier.local.name !== replaceSpecifier.local.name &&
      !nodePath.scope.lookup(replaceSpecifier.local.name)

    const matchedSpecifierPath = nodePath.get('specifiers', specIndex)
    const newSpecifier =
      replaceSpecifier.type === 'ImportDefaultSpecifier'
        ? j.importDefaultSpecifier(
            j.identifier(matchedSpecifierPath.node.local.name)
          )
        : j.importSpecifier(
            j.identifier(replaceSpecifier.imported.name),
            j.identifier(matchedSpecifierPath.node.local.name)
          )
    const newDeclaration = j.importDeclaration(
      [newSpecifier],
      j.stringLiteral(replaceSource)
    )
    const existingImport =
      findSource !== replaceSource
        ? root
            .find(j.ImportDeclaration, {
              source: { value: replaceSource },
            })
            .paths()[0]
        : null
    if (specifiers.length > 1) {
      if (node.source.value === replaceSource) {
        matchedSpecifierPath.replace(newSpecifier)
      } else {
        matchedSpecifierPath.prune()
        if (!existingImport) nodePath.insertAfter(newDeclaration)
      }
    } else {
      if (existingImport) nodePath.prune()
      else nodePath.replace(newDeclaration)
    }
    if (existingImport) {
      existingImport.get('specifiers', 0).insertBefore(newSpecifier)
    }

    if (renameBinding) {
      root
        .find(j.Identifier, { name: findSpecifier.local.name })
        .replaceWith(p => {
          if (
            p.scope &&
            p.scope.lookup(findSpecifier.local.name) === nodePath.scope
          ) {
            return j.identifier(replaceSpecifier.local.name)
          }
          return p.node
        })
    }
  }

  if (path.isAbsolute(findSource) || findSource.startsWith('.')) {
    findRelativeImports(file, root, findSource).forEach(processImport)
  } else {
    findAbsoluteImports(root, findSource).forEach(processImport)
  }
}
