import { expect, test } from 'vitest'
import {
  rangeWhereSkBeginsWith,
  rangeWhereSkBetween,
  rangeWhereSkEquals,
  rangeWhereSkGreaterThan,
  rangeWhereSkGreaterThanOrEquals,
  rangeWhereSkLessThan,
  rangeWhereSkLessThanOrEquals
} from '../../../src/lib/support/querySupport'

test('skEquals', () => {
  expect(rangeWhereSkEquals('FIELD#aaa')).toEqual({
    skConditionExpressionClause: '#sk = :sk',
    expressionAttributeValues: {
      ':sk': 'FIELD#aaa'
    }
  })
})

test('skGreaterThan', () => {
  expect(rangeWhereSkGreaterThan('FIELD#aaa')).toEqual({
    skConditionExpressionClause: '#sk > :sk',
    expressionAttributeValues: {
      ':sk': 'FIELD#aaa'
    }
  })
})

test('skGreaterThanOrEquals', () => {
  expect(rangeWhereSkGreaterThanOrEquals('FIELD#aaa')).toEqual({
    skConditionExpressionClause: '#sk >= :sk',
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

test('skLessThanOrEquals', () => {
  expect(rangeWhereSkLessThanOrEquals('FIELD#aaa')).toEqual({
    skConditionExpressionClause: '#sk <= :sk',
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
