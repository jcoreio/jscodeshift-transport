const {expect} = require('chai')
const j = require('jscodeshift').withParser('babylon')
const {replaceSources} = require('..')
const {spawn} = require('promisify-child-process')
const fs = require('fs-extra')
const path = require('path')

process.chdir(__dirname)

const code = `
import foo from 'foo'
const foo = require('foo')

import baz from './baz'
const baz = require('./baz')

import qux from '../qux'
const qux = require('../qux')
`

const expected = `
import foo from "./test/foo"
const foo = require("./test/foo")

import baz from "baz"
const baz = require("baz")

import qux from "../QUX"
const qux = require("../QUX")
`

describe(`replaceSources`, function () {
  it(`works`, function () {
    const root = j(code)

    const file = path.resolve(__dirname, '../temp.js')

    replaceSources(file, root, 'foo', './foo')
    replaceSources(file, root, '../baz', 'baz')
    replaceSources(file, root, '../../qux', ({source}) => source.toUpperCase())

    expect(root.toSource()).to.equal(expected)
  })
})
describe(`integration test`, async function () {
  this.timeout(30000)

  before(() => fs.writeFile('../temp.js', code, 'utf8'))
  after(() => fs.remove('../temp.js'))
  it(`works`, async function () {
    await spawn('jscodeshift', [
      '-t', '../index.js',
      '../temp.js',
      '--find=foo',
      '--replace=./foo',
    ], {stdio: 'inherit'})
    await spawn('jscodeshift', [
      '-t', '../index.js',
      '../temp.js',
      '--find=../baz',
      '--replace=baz',
    ], {stdio: 'inherit'})
    await spawn('jscodeshift', [
      '-t', '../index.js',
      '../temp.js',
      '--find=../../qux',
      '--replace=../../QUX',
    ], {stdio: 'inherit'})
    const result = await fs.readFile('../temp.js', 'utf8')
    expect(result).to.equal(expected)
  })
})
