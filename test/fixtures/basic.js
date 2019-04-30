exports.input = `
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

exports.replacements = [
  ['foo', './foo'],
  ['../baz', 'baz'],
  ['../../qux', s => s.toUpperCase()],
]

exports.output = `
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
