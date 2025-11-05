import { expect, test } from 'vitest'
import { throwError } from '../../../src/lib/util/errors.js'

test('throwError', () => {
  expect(throwError('just declare')).toBeDefined()
  expect(() => throwError('actually throw')()).toThrowError('actually throw')
})
