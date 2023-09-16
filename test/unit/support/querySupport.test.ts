import { expect, test } from 'vitest'
import {
  rangeWhereSkBeginsWith,
  rangeWhereSkBetween,
  rangeWhereSkGreaterThan,
  rangeWhereSkLessThan
} from '../../../src/lib/support/querySupport'

test('skGreaterThan', () => {
  expect(rangeWhereSkGreaterThan('FIELD#aaa')).toEqual({
    skConditionExpressionClause: '#sk > :sk',
    expressionAttributeValues: {
      ':sk': 'FIELD#aaa'
    }
  })
})

test('skLessThan', () => {
  expect(rangeWhereSkLessThan('FIELD#aaa')).toEqual({
    skConditionExpressionClause: '#sk < :sk',
    expressionAttributeValues: {
      ':sk': 'FIELD#aaa'
    }
  })
})

test('skBetween', () => {
  expect(rangeWhereSkBetween('FIELD#aaa', 'FIELD#zzz')).toEqual({
    skConditionExpressionClause: '#sk BETWEEN :from AND :to',
    expressionAttributeValues: {
      ':from': 'FIELD#aaa',
      ':to': 'FIELD#zzz'
    }
  })
})

test('skBeginsWith', () => {
  expect(rangeWhereSkBeginsWith('FIELD#abc')).toEqual({
    skConditionExpressionClause: 'begins_with(#sk, :skPrefix)',
    expressionAttributeValues: {
      ':skPrefix': 'FIELD#abc'
    }
  })
})
