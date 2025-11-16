import { NativeAttributeValue } from '@aws-sdk/lib-dynamodb'

/**
 * Shared utilities for DynamoDB expression evaluation.
 * Used by both condition expression and key condition expression evaluators.
 */

/**
 * Resolves an attribute name (handles #placeholder syntax).
 */
export function resolveAttributeName(
  name: string,
  expressionAttributeNames?: Record<string, string>
): string {
  const trimmed = name.trim()

  if (trimmed.startsWith('#')) {
    if (!expressionAttributeNames) {
      throw new Error(
        `Expression attribute name ${trimmed} used but no ExpressionAttributeNames provided`
      )
    }
    const resolved = expressionAttributeNames[trimmed]
    if (resolved === undefined) {
      throw new Error(`Expression attribute name ${trimmed} not found in ExpressionAttributeNames`)
    }
    return resolved
  }

  return trimmed
}

/**
 * Resolves an attribute value (handles :placeholder syntax).
 */
export function resolveAttributeValue(
  placeholder: string,
  expressionAttributeValues?: Record<string, NativeAttributeValue>
): NativeAttributeValue {
  const trimmed = placeholder.trim()

  if (!trimmed.startsWith(':')) {
    throw new Error(`Expected value placeholder starting with ':', got: ${trimmed}`)
  }

  if (!expressionAttributeValues) {
    throw new Error(
      `Expression attribute value ${trimmed} used but no ExpressionAttributeValues provided`
    )
  }

  const value = expressionAttributeValues[trimmed]
  if (value === undefined) {
    throw new Error(
      `Expression attribute value ${trimmed} not found in ExpressionAttributeValues`
    )
  }

  return value
}
