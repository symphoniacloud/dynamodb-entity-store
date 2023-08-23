import { expect, test } from 'vitest'
import { chunk, excludeKeys, removeNullOrUndefined, selectKeys } from '../../../src/lib/util/collections'

test('omitProperties', () => {
  expect(excludeKeys({ a: 1, b: 2, c: 3, d: 4 }, [])).toStrictEqual({ a: 1, b: 2, c: 3, d: 4 })
  expect(excludeKeys({ a: 1, b: 2, c: 3, d: 4 }, ['d'])).toStrictEqual({ a: 1, b: 2, c: 3 })
  expect(excludeKeys({ a: 1, b: 2, c: 3, d: 4 }, ['a', 'c'])).toStrictEqual({ b: 2, d: 4 })
  expect(excludeKeys({ a: 1, b: 2, c: 3, d: 4 }, ['a', 'b', 'c', 'd'])).toStrictEqual({})
})

test('selectProperties', () => {
  expect(selectKeys({ a: 1, b: 2, c: 3, d: 4 }, [])).toStrictEqual({})
  expect(selectKeys({ a: 1, b: 2, c: 3, d: 4 }, ['d'])).toStrictEqual({ d: 4 })
  expect(selectKeys({ a: 1, b: 2, c: 3, d: 4 }, ['a', 'c'])).toStrictEqual({ a: 1, c: 3 })
  expect(selectKeys({ a: 1, b: 2, c: 3, d: 4 }, ['a', 'b', 'c', 'd'])).toStrictEqual({
    a: 1,
    b: 2,
    c: 3,
    d: 4
  })
})

test('chunk', () => {
  expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
})

test('removeNullOrUndefined', () => {
  expect(removeNullOrUndefined([null, 1, 2, undefined, 3, null])).toEqual([1, 2, 3])
})
