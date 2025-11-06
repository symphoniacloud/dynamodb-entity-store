import { NativeAttributeValue } from '@aws-sdk/lib-dynamodb'

export interface ExpressionContext {
  item: Record<string, NativeAttributeValue>
  expressionAttributeValues?: Record<string, NativeAttributeValue>
  expressionAttributeNames?: Record<string, string>
}

/**
 * Evaluates a DynamoDB ConditionExpression against an item
 * This is a simplified implementation that handles common cases
 */
export function evaluateConditionExpression(
  expression: string | undefined,
  context: ExpressionContext
): boolean {
  if (!expression) return true

  // Simple tokenization - split by logical operators
  // This is a simplified parser that handles basic cases
  const tokens = tokenizeExpression(expression)

  return evaluateTokens(tokens, context)
}

function tokenizeExpression(expression: string): string[] {
  // Replace AND/OR with special markers for splitting
  const withMarkers = expression
    .replace(/\s+AND\s+/gi, '§AND§')
    .replace(/\s+OR\s+/gi, '§OR§')

  return withMarkers.split('§').map((t) => t.trim())
}

function evaluateTokens(tokens: string[], context: ExpressionContext): boolean {
  let result = true
  let currentOperator: 'AND' | 'OR' = 'AND'

  for (const token of tokens) {
    if (token === 'AND') {
      currentOperator = 'AND'
      continue
    }
    if (token === 'OR') {
      currentOperator = 'OR'
      continue
    }

    const tokenResult = evaluateSingleCondition(token, context)

    if (currentOperator === 'AND') {
      result = result && tokenResult
    } else {
      result = result || tokenResult
    }
  }

  return result
}

function evaluateSingleCondition(condition: string, context: ExpressionContext): boolean {
  // Handle function calls
  if (condition.includes('attribute_exists(')) {
    const match = condition.match(/attribute_exists\(([^)]+)\)/)
    if (match) {
      const attr = resolveAttributeName(match[1].trim(), context)
      return context.item[attr] !== undefined
    }
  }

  if (condition.includes('attribute_not_exists(')) {
    const match = condition.match(/attribute_not_exists\(([^)]+)\)/)
    if (match) {
      const attr = resolveAttributeName(match[1].trim(), context)
      return context.item[attr] === undefined
    }
  }

  if (condition.includes('begins_with(')) {
    const match = condition.match(/begins_with\(([^,]+),\s*([^)]+)\)/)
    if (match) {
      const attr = resolveAttributeName(match[1].trim(), context)
      const prefix = resolveAttributeValue(match[2].trim(), context)
      const value = context.item[attr]
      return typeof value === 'string' && typeof prefix === 'string' && value.startsWith(prefix)
    }
  }

  if (condition.includes('contains(')) {
    const match = condition.match(/contains\(([^,]+),\s*([^)]+)\)/)
    if (match) {
      const attr = resolveAttributeName(match[1].trim(), context)
      const searchValue = resolveAttributeValue(match[2].trim(), context)
      const value = context.item[attr]
      if (typeof value === 'string' && typeof searchValue === 'string') {
        return value.includes(searchValue)
      }
      if (Array.isArray(value)) {
        return value.includes(searchValue)
      }
    }
  }

  // Handle comparison operators
  if (condition.includes('<>')) {
    const [left, right] = condition.split('<>').map((s) => s.trim())
    return resolveValue(left, context) !== resolveValue(right, context)
  }

  if (condition.includes('<=')) {
    const [left, right] = condition.split('<=').map((s) => s.trim())
    const leftVal = resolveValue(left, context)
    const rightVal = resolveValue(right, context)
    return typeof leftVal === 'number' && typeof rightVal === 'number' && leftVal <= rightVal
  }

  if (condition.includes('>=')) {
    const [left, right] = condition.split('>=').map((s) => s.trim())
    const leftVal = resolveValue(left, context)
    const rightVal = resolveValue(right, context)
    return typeof leftVal === 'number' && typeof rightVal === 'number' && leftVal >= rightVal
  }

  if (condition.includes('<')) {
    const [left, right] = condition.split('<').map((s) => s.trim())
    const leftVal = resolveValue(left, context)
    const rightVal = resolveValue(right, context)
    return typeof leftVal === 'number' && typeof rightVal === 'number' && leftVal < rightVal
  }

  if (condition.includes('>')) {
    const [left, right] = condition.split('>').map((s) => s.trim())
    const leftVal = resolveValue(left, context)
    const rightVal = resolveValue(right, context)
    return typeof leftVal === 'number' && typeof rightVal === 'number' && leftVal > rightVal
  }

  if (condition.includes('=')) {
    const [left, right] = condition.split('=').map((s) => s.trim())
    return resolveValue(left, context) === resolveValue(right, context)
  }

  return true
}

function resolveValue(token: string, context: ExpressionContext): NativeAttributeValue {
  // If it starts with ':', it's a value placeholder
  if (token.startsWith(':')) {
    return resolveAttributeValue(token, context)
  }
  // If it starts with '#', it's an attribute name placeholder
  if (token.startsWith('#')) {
    const attrName = resolveAttributeName(token, context)
    return context.item[attrName]
  }
  // Otherwise, it's a direct attribute name
  return context.item[token]
}

function resolveAttributeName(placeholder: string, context: ExpressionContext): string {
  if (placeholder.startsWith('#') && context.expressionAttributeNames) {
    return context.expressionAttributeNames[placeholder] || placeholder
  }
  return placeholder
}

function resolveAttributeValue(
  placeholder: string,
  context: ExpressionContext
): NativeAttributeValue {
  if (placeholder.startsWith(':') && context.expressionAttributeValues) {
    return context.expressionAttributeValues[placeholder]
  }
  return placeholder
}

/**
 * Parse and apply an UpdateExpression to an item
 * Supports SET, REMOVE, ADD, DELETE operations
 */
export function applyUpdateExpression(
  item: Record<string, NativeAttributeValue>,
  updateExpression: string | undefined,
  expressionAttributeValues?: Record<string, NativeAttributeValue>,
  expressionAttributeNames?: Record<string, string>
): Record<string, NativeAttributeValue> {
  if (!updateExpression) return item

  const updated = { ...item }
  const context: ExpressionContext = {
    item: updated,
    expressionAttributeValues,
    expressionAttributeNames
  }

  // Parse different operation types
  const operations = parseUpdateExpression(updateExpression)

  // Apply SET operations
  for (const setOp of operations.set) {
    applySetOperation(updated, setOp, context)
  }

  // Apply REMOVE operations
  for (const removeOp of operations.remove) {
    applyRemoveOperation(updated, removeOp, context)
  }

  // Apply ADD operations
  for (const addOp of operations.add) {
    applyAddOperation(updated, addOp, context)
  }

  // Apply DELETE operations
  for (const deleteOp of operations.delete) {
    applyDeleteOperation(updated, deleteOp, context)
  }

  return updated
}

interface UpdateOperations {
  set: string[]
  remove: string[]
  add: string[]
  delete: string[]
}

function parseUpdateExpression(expression: string): UpdateOperations {
  const operations: UpdateOperations = {
    set: [],
    remove: [],
    add: [],
    delete: []
  }

  // Split by operation keywords
  const parts = expression.split(/\b(SET|REMOVE|ADD|DELETE)\b/i)
  let currentOp: keyof UpdateOperations | null = null

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim()
    if (!part) continue

    const upperPart = part.toUpperCase()
    if (upperPart === 'SET') {
      currentOp = 'set'
    } else if (upperPart === 'REMOVE') {
      currentOp = 'remove'
    } else if (upperPart === 'ADD') {
      currentOp = 'add'
    } else if (upperPart === 'DELETE') {
      currentOp = 'delete'
    } else if (currentOp) {
      // Split by commas to get individual operations
      const ops = part.split(',').map((o) => o.trim())
      operations[currentOp].push(...ops)
    }
  }

  return operations
}

function applySetOperation(
  item: Record<string, NativeAttributeValue>,
  operation: string,
  context: ExpressionContext
): void {
  const [left, right] = operation.split('=').map((s) => s.trim())
  const attrName = resolveAttributeName(left, context)

  // Handle if_not_exists function
  if (right.startsWith('if_not_exists(')) {
    const match = right.match(/if_not_exists\(([^,]+),\s*([^)]+)\)/)
    if (match) {
      const checkAttr = resolveAttributeName(match[1].trim(), context)
      const defaultValue = resolveAttributeValue(match[2].trim(), context)
      if (item[checkAttr] === undefined) {
        item[attrName] = defaultValue
      }
    }
  } else {
    const value = resolveAttributeValue(right, context)
    item[attrName] = value
  }
}

function applyRemoveOperation(
  item: Record<string, NativeAttributeValue>,
  operation: string,
  context: ExpressionContext
): void {
  const attrName = resolveAttributeName(operation, context)
  delete item[attrName]
}

function applyAddOperation(
  item: Record<string, NativeAttributeValue>,
  operation: string,
  context: ExpressionContext
): void {
  const [left, right] = operation.split(/\s+/).filter((s) => s.trim())
  const attrName = resolveAttributeName(left, context)
  const addValue = resolveAttributeValue(right, context)

  if (typeof item[attrName] === 'number' && typeof addValue === 'number') {
    item[attrName] = (item[attrName] as number) + addValue
  } else if (item[attrName] === undefined) {
    item[attrName] = addValue
  }
}

function applyDeleteOperation(
  item: Record<string, NativeAttributeValue>,
  operation: string,
  context: ExpressionContext
): void {
  const [left, right] = operation.split(/\s+/).filter((s) => s.trim())
  const attrName = resolveAttributeName(left, context)
  const deleteValue = resolveAttributeValue(right, context)

  if (Array.isArray(item[attrName])) {
    item[attrName] = (item[attrName] as NativeAttributeValue[]).filter(
      (v) => v !== deleteValue
    )
  }
}

/**
 * Apply projection expression to filter item attributes
 */
export function applyProjectionExpression(
  item: Record<string, NativeAttributeValue> | undefined,
  projectionExpression: string | undefined,
  expressionAttributeNames?: Record<string, string>
): Record<string, NativeAttributeValue> | undefined {
  if (!item || !projectionExpression) return item

  const projected: Record<string, NativeAttributeValue> = {}
  const attributes = projectionExpression.split(',').map((a) => a.trim())

  for (const attr of attributes) {
    const resolvedName = attr.startsWith('#') && expressionAttributeNames
      ? expressionAttributeNames[attr]
      : attr

    if (resolvedName && item[resolvedName] !== undefined) {
      projected[resolvedName] = item[resolvedName]
    }
  }

  return projected
}
