import { DynamoDBValues } from '../entities'
import { SkQueryRange } from '../singleEntityOperations'

// All of these use an expression attribute name instead of the actual sort key attribute name
// This is then substituted for the actual sort key attribute name when a query is run
// Because the expression attribute name is'#sk' you cannot use that same expression attribute name for anything else

// These ranges can be used both for table and GSI queries since the #sk expression attribute name
// is replaced with either the table or GSI SK attribute name depending on how the query is executed

export function rangeWhereSkEquals(sk: string): SkQueryRange {
  return queryRange('#sk = :sk', {
    ':sk': sk
  })
}

export function rangeWhereSkGreaterThan(sk: string): SkQueryRange {
  return queryRange('#sk > :sk', {
    ':sk': sk
  })
}

export function rangeWhereSkGreaterThanOrEquals(sk: string): SkQueryRange {
  return queryRange('#sk >= :sk', {
    ':sk': sk
  })
}

export function rangeWhereSkLessThan(sk: string): SkQueryRange {
  return queryRange('#sk < :sk', {
    ':sk': sk
  })
}

export function rangeWhereSkLessThanOrEquals(sk: string): SkQueryRange {
  return queryRange('#sk <= :sk', {
    ':sk': sk
  })
}

export function rangeWhereSkBetween(from: string, to: string): SkQueryRange {
  return queryRange('#sk BETWEEN :from AND :to', {
    ':from': from,
    ':to': to
  })
}

export function rangeWhereSkBeginsWith(prefix: string): SkQueryRange {
  return queryRange('begins_with(#sk, :skPrefix)', {
    ':skPrefix': prefix
  })
}

function queryRange(clause: string, values: DynamoDBValues): SkQueryRange {
  return {
    skConditionExpressionClause: clause,
    expressionAttributeValues: values
  }
}
