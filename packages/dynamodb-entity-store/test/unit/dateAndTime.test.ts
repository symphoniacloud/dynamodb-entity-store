import { expect, test } from 'vitest'
import {
  dateTimeAddDays,
  dateTimeAddHours,
  dateTimeAddMinutes,
  dateTimeAddSeconds
} from '../../src/lib/util/dateAndTime.js'

test('dateTimeAdd', () => {
  expect(dateTimeAddDays(new Date('2023-03-01T01:23:45'), 3)).toEqual(new Date('2023-03-04T01:23:45'))
  expect(dateTimeAddHours(new Date('2023-03-01T01:23:45'), 3)).toEqual(new Date('2023-03-01T04:23:45'))
  expect(dateTimeAddMinutes(new Date('2023-03-01T01:23:45'), 3)).toEqual(new Date('2023-03-01T01:26:45'))
  expect(dateTimeAddSeconds(new Date('2023-03-01T01:23:45'), 3)).toEqual(new Date('2023-03-01T01:23:48'))
})
