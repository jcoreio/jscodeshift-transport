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

exports.replacements = [[s => /foo|baz/.test(s), s => s.toUpperCase()]]

exports.output = `
import foo from "FOO"
const foo = require("FOO")
import("FOO")

import baz from "./BAZ"
const baz = require("./BAZ")
import("./BAZ")

import qux from '../qux'
const qux = require('../qux')
import('../qux')

function shouldBeUnchanged(require) {
  return require('foo')
}
`
