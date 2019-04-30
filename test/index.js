const { expect } = require('chai')
const j = require('jscodeshift').withParser('babylon')
const generate = require('@babel/generator').default
const { replaceModuleNames } = require('..')
const { spawn } = require('promisify-child-process')
const fs = require('fs-extra')
const path = require('path')
const requireGlob = require('require-glob')

process.chdir(__dirname)

const fixtures = requireGlob.sync('./fixtures/*.js')

function normalize(code) {
  const root = j(code)
  root
    .find(j.StringLiteral)
    .replaceWith(nodePath => j.stringLiteral(nodePath.node.value))
  return generate(root.nodes()[0]).code
}

for (let name in fixtures) {
  it(name, function() {
    const { input, replacements, output, file: _file } = fixtures[name]
    const root = j(input)
    const file = _file
      ? path.resolve(__dirname, 'fixtures', _file)
      : path.resolve(__dirname, '../temp.js')

    replacements.forEach(([find, replace]) =>
      replaceModuleNames(file, root, find, replace)
    )

    expect(normalize(root.toSource())).to.equal(normalize(output))
  })
}

const code = `
import foo from 'foo'
const foo = require('foo')
import('foo')

import baz from './baz'
const baz = require('./baz')
import('./baz')

import qux from '../qux'
const qux = require('../qux')
import('../qux')

function shouldBeUnchanged(require) {
  return require('foo')
}
`

const expected = `
import foo from "./test/foo"
const foo = require("./test/foo")
import("./test/foo")

import baz from "baz"
const baz = require("baz")
import("baz")

import qux from "../QUX"
const qux = require("../QUX")
import("../QUX")

function shouldBeUnchanged(require) {
  return require('foo')
}
`

describe(`integration test`, async function() {
  this.timeout(30000)

  beforeEach(() => fs.writeFile('../temp.js', code, 'utf8'))
  afterEach(() => fs.remove('../temp.js'))
  it(`works`, async function() {
    await spawn(
      'jscodeshift',
      ['-t', '..', '../temp.js', '--find=foo', '--replace=./foo'],
      { stdio: 'inherit' }
    )
    await spawn(
      'jscodeshift',
      ['-t', '..', '../temp.js', '--find=../baz', '--replace=baz'],
      { stdio: 'inherit' }
    )
    await spawn(
      'jscodeshift',
      ['-t', '..', '../temp.js', '--find=../../qux', '--replace=../../QUX'],
      { stdio: 'inherit' }
    )
    const result = await fs.readFile('../temp.js', 'utf8')
    expect(result).to.equal(expected)
  })
  it(`works with --regex option`, async function() {
    await spawn(
      'jscodeshift',
      [
        '-t',
        '..',
        '../temp.js',
        '--find=(foo|baz)',
        '--replace=$1glomb',
        '--regex=1',
      ],
      { stdio: 'inherit' }
    )
    const result = await fs.readFile('../temp.js', 'utf8')
    expect(result).to.equal(`
import foo from "fooglomb"
const foo = require("fooglomb")
import("fooglomb")

import baz from "./bazglomb"
const baz = require("./bazglomb")
import("./bazglomb")

import qux from '../qux'
const qux = require('../qux')
import('../qux')

function shouldBeUnchanged(require) {
  return require('foo')
}
`)
  })
})
