import { NativeAttributeValue } from '@aws-sdk/lib-dynamodb'
import { resolveAttributeName, resolveAttributeValue } from './expressionEvaluatorUtils.js'

// TODO - WARNING! THIS CODE IS FOR TESTS ONLY! DON'T USE THIS IN PRODUCTION
//   I haven't fully validated this implementation, and so I can't guarantee it is correct

/**
 * Simple condition expression evaluator for FakeDynamoDBInterface.
 *
 * Supported features:
 * - attribute_exists(path)
 * - attribute_not_exists(path)
 * - begins_with(path, substr)
 * - path = :value
 * - path <> :value
 * - path < :value
 * - path <= :value
 * - path > :value
 * - path >= :value
 * - NOT expr
 * - expr AND expr
 * - expr OR expr
 * - (expr) for grouping
 *
 * Unsupported features will throw a clear error.
 */

interface EvaluationContext {
  item: Record<string, NativeAttributeValue>
  expressionAttributeNames?: Record<string, string>
  expressionAttributeValues?: Record<string, NativeAttributeValue>
}

export class UnsupportedConditionExpressionError extends Error {
  constructor(feature: string) {
    super(
      `Unsupported condition expression feature: ${feature}. ` +
        `Currently supported: attribute_exists, attribute_not_exists, begins_with, =, <>, <, <=, >, >=, NOT, AND, OR, and parentheses.`
    )
    this.name = 'UnsupportedConditionExpressionError'
  }
}

export class ConditionalCheckFailedException extends Error {
  public readonly statusCode = 400
  public readonly body = {
    __type: 'com.amazonaws.dynamodb.v20120810#ConditionalCheckFailedException',
    message: 'The conditional request failed'
  }

  constructor(message = 'The conditional request failed') {
    super(message)
    this.name = 'ConditionalCheckFailedException'
  }
}

/**
 * Evaluates a DynamoDB condition expression against an item.
 * Throws if the condition is not met or if unsupported features are used.
 */
export function evaluateConditionExpression(
  conditionExpression: string,
  item: Record<string, NativeAttributeValue>,
  expressionAttributeNames?: Record<string, string>,
  expressionAttributeValues?: Record<string, NativeAttributeValue>
): void {
  const context: EvaluationContext = {
    item,
    expressionAttributeNames,
    expressionAttributeValues
  }

  // Check for unsupported features first
  detectUnsupportedFeatures(conditionExpression)

  // Evaluate the condition
  const result = evaluateExpression(conditionExpression, context)

  if (!result) {
    throw new ConditionalCheckFailedException()
  }
}

/**
 * Detects unsupported features in the condition expression and throws if found.
 */
function detectUnsupportedFeatures(expression: string): void {
  const unsupportedPatterns = [
    { pattern: /\bBETWEEN\b/i, name: 'BETWEEN operator' },
    { pattern: /\bIN\b\s*\(/i, name: 'IN operator' },
    { pattern: /\bcontains\s*\(/i, name: 'contains function' },
    { pattern: /\bsize\s*\(/i, name: 'size function' },
    { pattern: /\battribute_type\s*\(/i, name: 'attribute_type function' },
    { pattern: /\[\d+\]/g, name: 'list index access' },
    { pattern: /\.\w+/g, name: 'nested attribute paths (use ExpressionAttributeNames instead)' }
  ]

  for (const { pattern, name } of unsupportedPatterns) {
    if (pattern.test(expression)) {
      throw new UnsupportedConditionExpressionError(name)
    }
  }
}

/**
 * Recursively evaluates a condition expression.
 */
function evaluateExpression(expression: string, context: EvaluationContext): boolean {
  const trimmed = expression.trim()

  // Handle OR (lowest precedence)
  const orMatch = splitByOperator(trimmed, 'OR')
  if (orMatch) {
    return evaluateExpression(orMatch.left, context) || evaluateExpression(orMatch.right, context)
  }

  // Handle AND (higher precedence than OR)
  const andMatch = splitByOperator(trimmed, 'AND')
  if (andMatch) {
    return evaluateExpression(andMatch.left, context) && evaluateExpression(andMatch.right, context)
  }

  // Handle NOT
  if (/^NOT\s+/i.test(trimmed)) {
    const innerExpr = trimmed.replace(/^NOT\s+/i, '').trim()
    return !evaluateExpression(innerExpr, context)
  }

  // Handle parentheses
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    const inner = trimmed.slice(1, -1).trim()
    return evaluateExpression(inner, context)
  }

  // Handle function calls
  const functionMatch = trimmed.match(/^(\w+)\s*\(\s*(.+?)\s*\)$/)
  if (functionMatch) {
    const [, functionName, argsString] = functionMatch
    const args = splitFunctionArguments(argsString)
    return evaluateFunction(functionName, args, context)
  }

  // Handle comparisons (match longer operators first: <=, >=, <> before <, >, =)
  const comparisonMatch = trimmed.match(/^(.+?)\s*(<=|>=|<>|<|>|=)\s*(.+)$/)
  if (comparisonMatch) {
    const [, left, operator, right] = comparisonMatch
    return evaluateComparison(left.trim(), operator, right.trim(), context)
  }

  throw new Error(`Unable to parse condition expression: ${trimmed}`)
}

/**
 * Splits function arguments by comma, respecting parentheses.
 */
function splitFunctionArguments(argsString: string): string[] {
  const args: string[] = []
  let currentArg = ''
  let depth = 0

  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i]

    if (char === '(') {
      depth++
      currentArg += char
    } else if (char === ')') {
      depth--
      currentArg += char
    } else if (char === ',' && depth === 0) {
      // Found a comma at depth 0, so this is an argument separator
      args.push(currentArg.trim())
      currentArg = ''
    } else {
      currentArg += char
    }
  }

  // Add the last argument
  if (currentArg.trim()) {
    args.push(currentArg.trim())
  }

  return args
}

/**
 * Splits an expression by a binary operator, respecting parentheses and function calls.
 */
function splitByOperator(expression: string, operator: string): { left: string; right: string } | null {
  const regex = new RegExp(`\\b${operator}\\b`, 'i')
  let depth = 0
  let inFunction = false
  let i = 0

  while (i < expression.length) {
    const char = expression[i]

    if (char === '(') {
      depth++
      inFunction = true
    } else if (char === ')') {
      depth--
      if (depth === 0) inFunction = false
    }

    // Only split if we're at depth 0 (not inside parentheses)
    if (depth === 0 && !inFunction) {
      const remaining = expression.slice(i)
      const match = remaining.match(regex)
      if (match && match.index === 0) {
        const left = expression.slice(0, i).trim()
        const right = expression.slice(i + match[0].length).trim()
        if (left && right) {
          return { left, right }
        }
      }
    }

    i++
  }

  return null
}

/**
 * Evaluates a function call.
 */
function evaluateFunction(functionName: string, args: string[], context: EvaluationContext): boolean {
  switch (functionName.toLowerCase()) {
    case 'attribute_exists': {
      if (args.length !== 1) {
        throw new Error(`attribute_exists() expects 1 argument, got ${args.length}`)
      }
      const resolvedPath = resolveAttributeName(args[0], context.expressionAttributeNames)
      const value = getValueAtPath(resolvedPath, context.item)
      return value !== undefined
    }
    case 'attribute_not_exists': {
      if (args.length !== 1) {
        throw new Error(`attribute_not_exists() expects 1 argument, got ${args.length}`)
      }
      const resolvedPath = resolveAttributeName(args[0], context.expressionAttributeNames)
      const value = getValueAtPath(resolvedPath, context.item)
      return value === undefined
    }
    case 'begins_with': {
      if (args.length !== 2) {
        throw new Error(`begins_with() expects 2 arguments, got ${args.length}`)
      }
      const pathValue = resolveValue(args[0], context)
      const substrValue = resolveValue(args[1], context)

      // begins_with works with strings
      if (typeof pathValue !== 'string' || typeof substrValue !== 'string') {
        return false
      }
      return pathValue.startsWith(substrValue)
    }
    default:
      throw new UnsupportedConditionExpressionError(`function ${functionName}()`)
  }
}

/**
 * Evaluates a comparison expression.
 */
function evaluateComparison(
  left: string,
  operator: string,
  right: string,
  context: EvaluationContext
): boolean {
  const leftValue = resolveValue(left, context)
  const rightValue = resolveValue(right, context)

  switch (operator) {
    case '=':
      return leftValue === rightValue
    case '<>':
      return leftValue !== rightValue
    case '<':
      return (leftValue as number | string) < (rightValue as number | string)
    case '<=':
      return (leftValue as number | string) <= (rightValue as number | string)
    case '>':
      return (leftValue as number | string) > (rightValue as number | string)
    case '>=':
      return (leftValue as number | string) >= (rightValue as number | string)
    default:
      throw new UnsupportedConditionExpressionError(`operator ${operator}`)
  }
}

/**
 * Resolves a value from either an attribute path or an expression attribute value.
 */
function resolveValue(expression: string, context: EvaluationContext): NativeAttributeValue {
  const trimmed = expression.trim()

  // Check if it's an expression attribute value
  if (trimmed.startsWith(':')) {
    return resolveAttributeValue(trimmed, context.expressionAttributeValues)
  }

  // Otherwise, it's an attribute path
  const resolvedPath = resolveAttributeName(trimmed, context.expressionAttributeNames)
  return getValueAtPath(resolvedPath, context.item)
}

/**
 * Gets a value at a given path in the item.
 */
function getValueAtPath(path: string, item: Record<string, NativeAttributeValue>): NativeAttributeValue {
  // For now, only support simple attribute names (no nested paths)
  return item[path]
}
