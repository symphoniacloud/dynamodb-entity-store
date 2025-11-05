import { expect, test } from 'vitest'
import { FakeClock } from '../testSupportCode/fakes/fakeClock.js'
import { determineTTL } from '../../../src/lib/internal/common/operationsCommon.js'

test('determineTTL', () => {
  const clock = new FakeClock()
  expect(determineTTL(clock)).toBeUndefined()
  expect(determineTTL(clock, {})).toBeUndefined()
  expect(determineTTL(clock, { ttl: 100 })).toEqual(100)
  expect(determineTTL(clock, { ttlInFutureDays: 10 })).toEqual(1689102000)
  expect(determineTTL(clock, { ttl: 100, ttlInFutureDays: 10 })).toEqual(100)
})
