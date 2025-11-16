import { expect, test } from 'vitest'
import {
  evaluateConditionExpression,
  UnsupportedConditionExpressionError,
  ConditionalCheckFailedException
} from '../src/conditionExpressionEvaluator.js'

// Test helpers
function shouldPass(
  expression: string,
  item: Record<string, unknown>,
  attrNames?: Record<string, string>,
  attrValues?: Record<string, unknown>
) {
  expect(() =>
    evaluateConditionExpression(expression, item, attrNames, attrValues)
  ).not.toThrow()
}

function shouldFail(
  expression: string,
  item: Record<string, unknown>,
  attrNames?: Record<string, string>,
  attrValues?: Record<string, unknown>
) {
  expect(() =>
    evaluateConditionExpression(expression, item, attrNames, attrValues)
  ).toThrow(ConditionalCheckFailedException)
}

// attribute_exists and attribute_not_exists

test('attribute_exists returns true when attribute exists', () => {
  shouldPass('attribute_exists(name)', { name: 'alice' })
})

test('attribute_exists returns false when attribute does not exist', () => {
  shouldFail('attribute_exists(name)', {})
})

test('attribute_not_exists returns true when attribute does not exist', () => {
  shouldPass('attribute_not_exists(name)', {})
})

test('attribute_not_exists returns false when attribute exists', () => {
  shouldFail('attribute_not_exists(name)', { name: 'alice' })
})

// Equality comparisons

test('equality comparison with matching values', () => {
  shouldPass('name = :value', { name: 'alice' }, undefined, { ':value': 'alice' })
})

test('equality comparison with non-matching values', () => {
  shouldFail('name = :value', { name: 'alice' }, undefined, { ':value': 'bob' })
})

test('equality comparison when attribute does not exist', () => {
  shouldFail('name = :value', {}, undefined, { ':value': 'alice' })
})

test('inequality comparison (<>) with different values', () => {
  shouldPass('name <> :value', { name: 'alice' }, undefined, { ':value': 'bob' })
})

test('inequality comparison (<>) with same values', () => {
  shouldFail('name <> :value', { name: 'alice' }, undefined, { ':value': 'alice' })
})

test('equality comparison with number values', () => {
  shouldPass('age = :value', { age: 30 }, undefined, { ':value': 30 })
})

test('equality comparison with boolean values', () => {
  shouldPass('active = :value', { active: true }, undefined, { ':value': true })
})

// NOT operator

test('NOT with attribute_exists', () => {
  shouldPass('NOT attribute_exists(name)', {})
  shouldFail('NOT attribute_exists(name)', { name: 'alice' })
})

test('NOT with equality', () => {
  shouldPass('NOT name = :value', { name: 'alice' }, undefined, { ':value': 'bob' })
  shouldFail('NOT name = :value', { name: 'alice' }, undefined, { ':value': 'alice' })
})

// AND operator

test('AND with both conditions true', () => {
  shouldPass(
    'name = :name AND status = :status',
    { name: 'alice', status: 'active' },
    undefined,
    { ':name': 'alice', ':status': 'active' }
  )
})

test('AND with first condition false', () => {
  shouldFail(
    'name = :name AND status = :status',
    { name: 'bob', status: 'active' },
    undefined,
    { ':name': 'alice', ':status': 'active' }
  )
})

test('AND with second condition false', () => {
  shouldFail(
    'name = :name AND status = :status',
    { name: 'alice', status: 'inactive' },
    undefined,
    { ':name': 'alice', ':status': 'active' }
  )
})

test('AND with both conditions false', () => {
  shouldFail(
    'name = :name AND status = :status',
    { name: 'bob', status: 'inactive' },
    undefined,
    { ':name': 'alice', ':status': 'active' }
  )
})

// OR operator

test('OR with both conditions true', () => {
  shouldPass(
    'name = :name1 OR name = :name2',
    { name: 'alice' },
    undefined,
    { ':name1': 'alice', ':name2': 'bob' }
  )
})

test('OR with first condition true', () => {
  shouldPass(
    'name = :name1 OR name = :name2',
    { name: 'alice' },
    undefined,
    { ':name1': 'alice', ':name2': 'bob' }
  )
})

test('OR with second condition true', () => {
  shouldPass(
    'name = :name1 OR name = :name2',
    { name: 'bob' },
    undefined,
    { ':name1': 'alice', ':name2': 'bob' }
  )
})

test('OR with both conditions false', () => {
  shouldFail(
    'name = :name1 OR name = :name2',
    { name: 'charlie' },
    undefined,
    { ':name1': 'alice', ':name2': 'bob' }
  )
})

// Operator precedence and grouping

test('AND has higher precedence than OR', () => {
  // name = 'alice' OR name = 'bob' AND status = 'active'
  // Should be evaluated as: name = 'alice' OR (name = 'bob' AND status = 'active')
  shouldPass(
    'name = :name1 OR name = :name2 AND status = :status',
    { name: 'alice', status: 'inactive' },
    undefined,
    { ':name1': 'alice', ':name2': 'bob', ':status': 'active' }
  )
})

test('parentheses override precedence', () => {
  // (name = 'alice' OR name = 'bob') AND status = 'active'
  shouldPass(
    '(name = :name1 OR name = :name2) AND status = :status',
    { name: 'alice', status: 'active' },
    undefined,
    { ':name1': 'alice', ':name2': 'bob', ':status': 'active' }
  )

  shouldFail(
    '(name = :name1 OR name = :name2) AND status = :status',
    { name: 'alice', status: 'inactive' },
    undefined,
    { ':name1': 'alice', ':name2': 'bob', ':status': 'active' }
  )
})

test('complex nested expression with NOT, AND, OR, and parentheses', () => {
  // NOT (name = 'alice' AND status = 'inactive') OR role = 'admin'
  shouldPass(
    'NOT (name = :name AND status = :status) OR role = :role',
    { name: 'alice', status: 'active', role: 'user' },
    undefined,
    { ':name': 'alice', ':status': 'inactive', ':role': 'admin' }
  )

  shouldPass(
    'NOT (name = :name AND status = :status) OR role = :role',
    { name: 'alice', status: 'inactive', role: 'admin' },
    undefined,
    { ':name': 'alice', ':status': 'inactive', ':role': 'admin' }
  )
})

// ExpressionAttributeNames

test('ExpressionAttributeNames for simple attribute', () => {
  shouldPass(
    '#n = :value',
    { name: 'alice' },
    { '#n': 'name' },
    { ':value': 'alice' }
  )
})

test('ExpressionAttributeNames with reserved word', () => {
  shouldPass(
    '#s = :value',
    { status: 'active' },
    { '#s': 'status' },
    { ':value': 'active' }
  )
})

test('ExpressionAttributeNames in function call', () => {
  shouldPass('attribute_exists(#n)', { name: 'alice' }, { '#n': 'name' })
})

test('missing ExpressionAttributeNames throws error', () => {
  expect(() =>
    evaluateConditionExpression('#n = :value', { name: 'alice' }, undefined, { ':value': 'alice' })
  ).toThrow('Expression attribute name #n used but no ExpressionAttributeNames provided')
})

test('undefined ExpressionAttributeNames placeholder throws error', () => {
  expect(() =>
    evaluateConditionExpression(
      '#unknown = :value',
      { name: 'alice' },
      { '#n': 'name' },
      { ':value': 'alice' }
    )
  ).toThrow('Expression attribute name #unknown not found in ExpressionAttributeNames')
})

// ExpressionAttributeValues

test('missing ExpressionAttributeValues throws error', () => {
  expect(() => evaluateConditionExpression('name = :value', { name: 'alice' })).toThrow(
    'Expression attribute value :value used but no ExpressionAttributeValues provided'
  )
})

test('undefined ExpressionAttributeValues placeholder throws error', () => {
  expect(() =>
    evaluateConditionExpression('name = :unknown', { name: 'alice' }, undefined, { ':value': 'alice' })
  ).toThrow('Expression attribute value :unknown not found in ExpressionAttributeValues')
})

// Unsupported features

test('throws on BETWEEN operator', () => {
  expect(() =>
    evaluateConditionExpression(
      'age BETWEEN :low AND :high',
      { age: 30 },
      undefined,
      { ':low': 20, ':high': 40 }
    )
  ).toThrow(UnsupportedConditionExpressionError)
})

test('throws on IN operator', () => {
  expect(() =>
    evaluateConditionExpression(
      'name IN (:name1, :name2)',
      { name: 'alice' },
      undefined,
      { ':name1': 'alice', ':name2': 'bob' }
    )
  ).toThrow(UnsupportedConditionExpressionError)
})

test('throws on begins_with function', () => {
  expect(() =>
    evaluateConditionExpression(
      'begins_with(name, :prefix)',
      { name: 'alice' },
      undefined,
      { ':prefix': 'al' }
    )
  ).toThrow(UnsupportedConditionExpressionError)
})

test('throws on contains function', () => {
  expect(() =>
    evaluateConditionExpression(
      'contains(name, :substr)',
      { name: 'alice' },
      undefined,
      { ':substr': 'lic' }
    )
  ).toThrow(UnsupportedConditionExpressionError)
})

test('throws on size function', () => {
  expect(() =>
    evaluateConditionExpression('size(name) = :len', { name: 'alice' }, undefined, { ':len': 5 })
  ).toThrow(UnsupportedConditionExpressionError)
})

test('throws on attribute_type function', () => {
  expect(() =>
    evaluateConditionExpression(
      'attribute_type(name, :type)',
      { name: 'alice' },
      undefined,
      { ':type': 'S' }
    )
  ).toThrow(UnsupportedConditionExpressionError)
})

test('throws on < comparison operator', () => {
  expect(() =>
    evaluateConditionExpression('age < :max', { age: 30 }, undefined, { ':max': 40 })
  ).toThrow(UnsupportedConditionExpressionError)
})

test('throws on > comparison operator', () => {
  expect(() =>
    evaluateConditionExpression('age > :min', { age: 30 }, undefined, { ':min': 20 })
  ).toThrow(UnsupportedConditionExpressionError)
})

test('throws on <= comparison operator', () => {
  expect(() =>
    evaluateConditionExpression('age <= :max', { age: 30 }, undefined, { ':max': 40 })
  ).toThrow(UnsupportedConditionExpressionError)
})

test('throws on >= comparison operator', () => {
  expect(() =>
    evaluateConditionExpression('age >= :min', { age: 30 }, undefined, { ':min': 20 })
  ).toThrow(UnsupportedConditionExpressionError)
})

test('throws on nested attribute path with dot notation', () => {
  expect(() =>
    evaluateConditionExpression('user.name = :value', { user: { name: 'alice' } }, undefined, {
      ':value': 'alice'
    })
  ).toThrow(UnsupportedConditionExpressionError)
})

test('throws on list index access', () => {
  expect(() =>
    evaluateConditionExpression('items[0] = :value', { items: ['a', 'b'] }, undefined, {
      ':value': 'a'
    })
  ).toThrow(UnsupportedConditionExpressionError)
})

// Error messages

test('unsupported feature error includes helpful message', () => {
  try {
    evaluateConditionExpression('age > :min', { age: 30 }, undefined, { ':min': 20 })
    expect.fail('Should have thrown')
  } catch (e) {
    expect(e).toBeInstanceOf(UnsupportedConditionExpressionError)
    expect((e as Error).message).toContain('Currently supported')
    expect((e as Error).message).toContain('attribute_exists')
  }
})

test('conditional check failed error matches DynamoDB format', () => {
  try {
    evaluateConditionExpression('name = :value', { name: 'alice' }, undefined, { ':value': 'bob' })
    expect.fail('Should have thrown')
  } catch (e) {
    expect(e).toBeInstanceOf(ConditionalCheckFailedException)
    const error = e as ConditionalCheckFailedException
    expect(error.statusCode).toBe(400)
    expect(error.body.__type).toBe('com.amazonaws.dynamodb.v20120810#ConditionalCheckFailedException')
    expect(error.message).toBe('The conditional request failed')
  }
})
