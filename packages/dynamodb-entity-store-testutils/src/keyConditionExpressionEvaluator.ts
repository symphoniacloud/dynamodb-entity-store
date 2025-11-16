import { NativeAttributeValue } from '@aws-sdk/lib-dynamodb'
import { resolveAttributeName, resolveAttributeValue } from './expressionEvaluatorUtils.js'

// TODO - WARNING! THIS CODE IS FOR TESTS ONLY! DON'T USE THIS IN PRODUCTION
//   I haven't fully validated this implementation, and so I can't guarantee it is correct

/**
 * Simple key condition expression evaluator for FakeDynamoDBInterface queries.
 *
 * Supported features:
 * - PK = :value (required)
 * - SK = :value
 * - SK < :value, SK > :value, SK <= :value, SK >= :value
 * - begins_with(SK, :value)
 * - PK = :pk AND SK <condition>
 *
 * Unsupported features will throw a clear error.
 */

export class UnsupportedKeyConditionExpressionError extends Error {
  constructor(feature: string) {
    super(
      `Unsupported key condition expression feature: ${feature}. ` +
        `Currently supported: PK = :value, SK comparisons (=, <, >, <=, >=), begins_with(SK, :value), and AND.`
    )
    this.name = 'UnsupportedKeyConditionExpressionError'
  }
}

export interface KeyCondition {
  pkAttributeName: string
  pkValue: NativeAttributeValue
  skCondition?: {
    attributeName: string
    operator: '=' | '<' | '>' | '<=' | '>=' | 'begins_with'
    value: NativeAttributeValue
  }
}

/**
 * Parses a key condition expression and returns the structured key condition.
 */
export function parseKeyConditionExpression(
  keyConditionExpression: string,
  expressionAttributeNames?: Record<string, string>,
  expressionAttributeValues?: Record<string, NativeAttributeValue>
): KeyCondition {
  // Check for unsupported features first
  detectUnsupportedFeatures(keyConditionExpression)

  const trimmed = keyConditionExpression.trim()

  // Split by AND
  const parts = splitByAnd(trimmed)

  if (parts.length === 0 || parts.length > 2) {
    throw new Error('Key condition expression must have 1 or 2 conditions (PK and optional SK)')
  }

  // Parse PK condition (required)
  const pkCondition = parsePkCondition(parts[0], expressionAttributeNames, expressionAttributeValues)

  // Parse SK condition (optional)
  let skCondition: KeyCondition['skCondition'] = undefined
  if (parts.length === 2) {
    skCondition = parseSkCondition(parts[1], expressionAttributeNames, expressionAttributeValues)
  }

  return {
    pkAttributeName: pkCondition.attributeName,
    pkValue: pkCondition.value,
    skCondition
  }
}

/**
 * Evaluates whether an item matches the key condition.
 */
export function matchesKeyCondition(
  item: Record<string, NativeAttributeValue>,
  keyCondition: KeyCondition
): boolean {
  // Check PK
  const pkValue = item[keyCondition.pkAttributeName]
  if (pkValue !== keyCondition.pkValue) {
    return false
  }

  // Check SK if present
  if (keyCondition.skCondition) {
    const skValue = item[keyCondition.skCondition.attributeName]

    switch (keyCondition.skCondition.operator) {
      case '=':
        return skValue === keyCondition.skCondition.value
      case '<':
        return compare(skValue, keyCondition.skCondition.value) < 0
      case '>':
        return compare(skValue, keyCondition.skCondition.value) > 0
      case '<=':
        return compare(skValue, keyCondition.skCondition.value) <= 0
      case '>=':
        return compare(skValue, keyCondition.skCondition.value) >= 0
      case 'begins_with':
        return (
          typeof skValue === 'string' &&
          typeof keyCondition.skCondition.value === 'string' &&
          skValue.startsWith(keyCondition.skCondition.value)
        )
    }
  }

  return true
}

/**
 * Simple comparison function for sort key values.
 * For now, only handles strings and numbers.
 */
function compare(a: NativeAttributeValue, b: NativeAttributeValue): number {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b)
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  // For other types, treat as equal
  return 0
}

/**
 * Detects unsupported features in the key condition expression.
 */
function detectUnsupportedFeatures(expression: string): void {
  const unsupportedPatterns = [
    { pattern: /\bOR\b/i, name: 'OR operator' },
    { pattern: /\bBETWEEN\b/i, name: 'BETWEEN operator' },
    { pattern: /\bIN\b\s*\(/i, name: 'IN operator' },
    { pattern: /\battribute_exists\s*\(/i, name: 'attribute_exists function' },
    { pattern: /\battribute_not_exists\s*\(/i, name: 'attribute_not_exists function' },
    { pattern: /\bcontains\s*\(/i, name: 'contains function' },
    { pattern: /\bsize\s*\(/i, name: 'size function' },
    { pattern: /\bNOT\b/i, name: 'NOT operator' }
  ]

  for (const { pattern, name } of unsupportedPatterns) {
    if (pattern.test(expression)) {
      throw new UnsupportedKeyConditionExpressionError(name)
    }
  }
}

/**
 * Splits expression by AND, respecting function calls and parentheses.
 */
function splitByAnd(expression: string): string[] {
  const parts: string[] = []
  let depth = 0
  let currentPart = ''

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i]

    if (char === '(') {
      depth++
      currentPart += char
    } else if (char === ')') {
      depth--
      currentPart += char
    } else if (depth === 0) {
      // Check for AND keyword
      const remaining = expression.slice(i)
      const andMatch = remaining.match(/^\s*AND\s+/i)
      if (andMatch) {
        parts.push(currentPart.trim())
        currentPart = ''
        i += andMatch[0].length - 1
        continue
      }
      currentPart += char
    } else {
      currentPart += char
    }
  }

  if (currentPart.trim()) {
    parts.push(currentPart.trim())
  }

  return parts
}

/**
 * Parses the PK condition (must be equality).
 */
function parsePkCondition(
  condition: string,
  expressionAttributeNames?: Record<string, string>,
  expressionAttributeValues?: Record<string, NativeAttributeValue>
): { attributeName: string; value: NativeAttributeValue } {
  const match = condition.match(/^(.+?)\s*=\s*(.+)$/)
  if (!match) {
    throw new Error('PK condition must be an equality (PK = :value)')
  }

  const [, attrName, valuePlaceholder] = match
  const attributeName = resolveAttributeName(attrName.trim(), expressionAttributeNames)
  const value = resolveAttributeValue(valuePlaceholder.trim(), expressionAttributeValues)

  return { attributeName, value }
}

/**
 * Parses the SK condition.
 */
function parseSkCondition(
  condition: string,
  expressionAttributeNames?: Record<string, string>,
  expressionAttributeValues?: Record<string, NativeAttributeValue>
): KeyCondition['skCondition'] {
  // Check for begins_with function
  const beginsWithMatch = condition.match(/^begins_with\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)$/i)
  if (beginsWithMatch) {
    const [, attrName, valuePlaceholder] = beginsWithMatch
    return {
      attributeName: resolveAttributeName(attrName.trim(), expressionAttributeNames),
      operator: 'begins_with',
      value: resolveAttributeValue(valuePlaceholder.trim(), expressionAttributeValues)
    }
  }

  // Check for comparison operators
  const comparisonMatch = condition.match(/^(.+?)\s*(<=|>=|<>|<|>|=)\s*(.+)$/)
  if (!comparisonMatch) {
    throw new Error(`Unable to parse SK condition: ${condition}`)
  }

  const [, attrName, operator, valuePlaceholder] = comparisonMatch

  // Reject <> (not allowed in key conditions)
  if (operator === '<>') {
    throw new UnsupportedKeyConditionExpressionError('not equals (<>) operator in key condition')
  }

  return {
    attributeName: resolveAttributeName(attrName.trim(), expressionAttributeNames),
    operator: operator as '=' | '<' | '>' | '<=' | '>=',
    value: resolveAttributeValue(valuePlaceholder.trim(), expressionAttributeValues)
  }
}
