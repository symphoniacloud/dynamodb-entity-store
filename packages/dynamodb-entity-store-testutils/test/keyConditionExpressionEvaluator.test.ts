import { expect, test } from 'vitest'
import {
  parseKeyConditionExpression,
  matchesKeyCondition,
  UnsupportedKeyConditionExpressionError,
  type KeyCondition
} from '../src/keyConditionExpressionEvaluator.js'

// PK-only queries

test('parse PK equality condition', () => {
  const result = parseKeyConditionExpression('PK = :pk', undefined, { ':pk': 'USER#123' })

  expect(result).toEqual({
    pkAttributeName: 'PK',
    pkValue: 'USER#123',
    skCondition: undefined
  })
})

test('PK equality matches correctly', () => {
  const condition: KeyCondition = {
    pkAttributeName: 'PK',
    pkValue: 'USER#123',
    skCondition: undefined
  }

  expect(matchesKeyCondition({ PK: 'USER#123', name: 'alice' }, condition)).toBe(true)
  expect(matchesKeyCondition({ PK: 'USER#456', name: 'bob' }, condition)).toBe(false)
})

// PK + SK equality

test('parse PK and SK equality condition', () => {
  const result = parseKeyConditionExpression('PK = :pk AND SK = :sk', undefined, {
    ':pk': 'USER#123',
    ':sk': 'PROFILE'
  })

  expect(result).toEqual({
    pkAttributeName: 'PK',
    pkValue: 'USER#123',
    skCondition: {
      attributeName: 'SK',
      operator: '=',
      value: 'PROFILE'
    }
  })
})

test('PK and SK equality matches correctly', () => {
  const condition: KeyCondition = {
    pkAttributeName: 'PK',
    pkValue: 'USER#123',
    skCondition: {
      attributeName: 'SK',
      operator: '=',
      value: 'PROFILE'
    }
  }

  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'PROFILE' }, condition)).toBe(true)
  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'SETTINGS' }, condition)).toBe(false)
  expect(matchesKeyCondition({ PK: 'USER#456', SK: 'PROFILE' }, condition)).toBe(false)
})

// SK comparison operators

test('parse PK and SK with less than', () => {
  const result = parseKeyConditionExpression('PK = :pk AND SK < :sk', undefined, {
    ':pk': 'USER#123',
    ':sk': 'ITEM#100'
  })

  expect(result.skCondition).toEqual({
    attributeName: 'SK',
    operator: '<',
    value: 'ITEM#100'
  })
})

test('SK less than matches correctly', () => {
  const condition: KeyCondition = {
    pkAttributeName: 'PK',
    pkValue: 'USER#123',
    skCondition: {
      attributeName: 'SK',
      operator: '<',
      value: 'ITEM#100'
    }
  }

  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'ITEM#050' }, condition)).toBe(true)
  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'ITEM#100' }, condition)).toBe(false)
  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'ITEM#200' }, condition)).toBe(false)
})

test('parse PK and SK with greater than', () => {
  const result = parseKeyConditionExpression('PK = :pk AND SK > :sk', undefined, {
    ':pk': 'USER#123',
    ':sk': 'ITEM#100'
  })

  expect(result.skCondition).toEqual({
    attributeName: 'SK',
    operator: '>',
    value: 'ITEM#100'
  })
})

test('SK greater than matches correctly', () => {
  const condition: KeyCondition = {
    pkAttributeName: 'PK',
    pkValue: 'USER#123',
    skCondition: {
      attributeName: 'SK',
      operator: '>',
      value: 'ITEM#100'
    }
  }

  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'ITEM#200' }, condition)).toBe(true)
  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'ITEM#100' }, condition)).toBe(false)
  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'ITEM#050' }, condition)).toBe(false)
})

test('parse PK and SK with less than or equal', () => {
  const result = parseKeyConditionExpression('PK = :pk AND SK <= :sk', undefined, {
    ':pk': 'USER#123',
    ':sk': 'ITEM#100'
  })

  expect(result.skCondition?.operator).toBe('<=')
})

test('SK less than or equal matches correctly', () => {
  const condition: KeyCondition = {
    pkAttributeName: 'PK',
    pkValue: 'USER#123',
    skCondition: {
      attributeName: 'SK',
      operator: '<=',
      value: 'ITEM#100'
    }
  }

  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'ITEM#050' }, condition)).toBe(true)
  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'ITEM#100' }, condition)).toBe(true)
  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'ITEM#200' }, condition)).toBe(false)
})

test('parse PK and SK with greater than or equal', () => {
  const result = parseKeyConditionExpression('PK = :pk AND SK >= :sk', undefined, {
    ':pk': 'USER#123',
    ':sk': 'ITEM#100'
  })

  expect(result.skCondition?.operator).toBe('>=')
})

test('SK greater than or equal matches correctly', () => {
  const condition: KeyCondition = {
    pkAttributeName: 'PK',
    pkValue: 'USER#123',
    skCondition: {
      attributeName: 'SK',
      operator: '>=',
      value: 'ITEM#100'
    }
  }

  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'ITEM#200' }, condition)).toBe(true)
  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'ITEM#100' }, condition)).toBe(true)
  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'ITEM#050' }, condition)).toBe(false)
})

// begins_with function

test('parse PK and begins_with(SK, :prefix)', () => {
  const result = parseKeyConditionExpression('PK = :pk AND begins_with(SK, :prefix)', undefined, {
    ':pk': 'USER#123',
    ':prefix': 'ITEM#'
  })

  expect(result.skCondition).toEqual({
    attributeName: 'SK',
    operator: 'begins_with',
    value: 'ITEM#'
  })
})

test('begins_with matches correctly', () => {
  const condition: KeyCondition = {
    pkAttributeName: 'PK',
    pkValue: 'USER#123',
    skCondition: {
      attributeName: 'SK',
      operator: 'begins_with',
      value: 'ITEM#'
    }
  }

  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'ITEM#100' }, condition)).toBe(true)
  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'ITEM#200' }, condition)).toBe(true)
  expect(matchesKeyCondition({ PK: 'USER#123', SK: 'ORDER#100' }, condition)).toBe(false)
})

// ExpressionAttributeNames

test('parse with ExpressionAttributeNames', () => {
  const result = parseKeyConditionExpression(
    '#pk = :pk AND #sk = :sk',
    { '#pk': 'PK', '#sk': 'SK' },
    { ':pk': 'USER#123', ':sk': 'PROFILE' }
  )

  expect(result).toEqual({
    pkAttributeName: 'PK',
    pkValue: 'USER#123',
    skCondition: {
      attributeName: 'SK',
      operator: '=',
      value: 'PROFILE'
    }
  })
})

test('missing ExpressionAttributeNames throws error', () => {
  expect(() =>
    parseKeyConditionExpression('#pk = :pk', undefined, { ':pk': 'USER#123' })
  ).toThrow('Expression attribute name #pk used but no ExpressionAttributeNames provided')
})

test('undefined ExpressionAttributeNames placeholder throws error', () => {
  expect(() =>
    parseKeyConditionExpression('#unknown = :pk', { '#pk': 'PK' }, { ':pk': 'USER#123' })
  ).toThrow('Expression attribute name #unknown not found in ExpressionAttributeNames')
})

// ExpressionAttributeValues

test('missing ExpressionAttributeValues throws error', () => {
  expect(() => parseKeyConditionExpression('PK = :pk', undefined, undefined)).toThrow(
    'Expression attribute value :pk used but no ExpressionAttributeValues provided'
  )
})

test('undefined ExpressionAttributeValues placeholder throws error', () => {
  expect(() => parseKeyConditionExpression('PK = :unknown', undefined, { ':pk': 'USER#123' })).toThrow(
    'Expression attribute value :unknown not found in ExpressionAttributeValues'
  )
})

// Numeric comparisons

test('SK comparisons work with numbers', () => {
  const condition: KeyCondition = {
    pkAttributeName: 'PK',
    pkValue: 'USER#123',
    skCondition: {
      attributeName: 'timestamp',
      operator: '>',
      value: 100
    }
  }

  expect(matchesKeyCondition({ PK: 'USER#123', timestamp: 200 }, condition)).toBe(true)
  expect(matchesKeyCondition({ PK: 'USER#123', timestamp: 50 }, condition)).toBe(false)
})

// Unsupported features

test('throws on OR operator', () => {
  expect(() =>
    parseKeyConditionExpression('PK = :pk1 OR PK = :pk2', undefined, {
      ':pk1': 'USER#123',
      ':pk2': 'USER#456'
    })
  ).toThrow(UnsupportedKeyConditionExpressionError)
})

test('throws on BETWEEN operator', () => {
  expect(() =>
    parseKeyConditionExpression('PK = :pk AND SK BETWEEN :low AND :high', undefined, {
      ':pk': 'USER#123',
      ':low': 'A',
      ':high': 'Z'
    })
  ).toThrow(UnsupportedKeyConditionExpressionError)
})

test('throws on IN operator', () => {
  expect(() =>
    parseKeyConditionExpression('PK IN (:pk1, :pk2)', undefined, {
      ':pk1': 'USER#123',
      ':pk2': 'USER#456'
    })
  ).toThrow(UnsupportedKeyConditionExpressionError)
})

test('throws on attribute_exists function', () => {
  expect(() =>
    parseKeyConditionExpression('attribute_exists(PK)', undefined, undefined)
  ).toThrow(UnsupportedKeyConditionExpressionError)
})

test('throws on NOT operator', () => {
  expect(() =>
    parseKeyConditionExpression('NOT PK = :pk', undefined, { ':pk': 'USER#123' })
  ).toThrow(UnsupportedKeyConditionExpressionError)
})

test('throws on contains function', () => {
  expect(() =>
    parseKeyConditionExpression('PK = :pk AND contains(SK, :val)', undefined, {
      ':pk': 'USER#123',
      ':val': 'test'
    })
  ).toThrow(UnsupportedKeyConditionExpressionError)
})

test('throws on <> (not equals) in SK condition', () => {
  expect(() =>
    parseKeyConditionExpression('PK = :pk AND SK <> :sk', undefined, {
      ':pk': 'USER#123',
      ':sk': 'ITEM#100'
    })
  ).toThrow(UnsupportedKeyConditionExpressionError)
})

// Error messages

test('unsupported feature error includes helpful message', () => {
  try {
    parseKeyConditionExpression('PK = :pk OR PK = :pk2', undefined, {
      ':pk': 'USER#123',
      ':pk2': 'USER#456'
    })
    expect.fail('Should have thrown')
  } catch (e) {
    expect(e).toBeInstanceOf(UnsupportedKeyConditionExpressionError)
    expect((e as Error).message).toContain('Currently supported')
  }
})

// Note: We cannot detect "SK-only" queries at parse time without knowing the actual
// PK/SK attribute names. The expression "SK = :sk" is syntactically valid as a PK condition.
// Validation would happen at query execution time when the table schema is known.

test('PK must be equality', () => {
  expect(() =>
    parseKeyConditionExpression('PK > :pk', undefined, { ':pk': 'USER#123' })
  ).toThrow('PK condition must be an equality')
})
