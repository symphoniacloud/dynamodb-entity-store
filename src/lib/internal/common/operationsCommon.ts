import { DynamoDBValues } from '../../entities.js'
import { EntityContext } from '../entityContext.js'
import { Clock, secondsTimestampInFutureDays } from '../../util/index.js'
import { DeleteItemOutput } from '@aws-sdk/client-dynamodb'
import {
  ReturnConsumedCapacityOption,
  ReturnItemCollectionMetricsOption,
  ReturnValuesOptions
} from '../../singleEntityAdvancedOperations.js'

export interface WithExpression {
  expressionAttributeValues?: DynamoDBValues
  expressionAttributeNames?: Record<string, string>
}

export interface Conditional extends WithExpression {
  conditionExpression?: string
}

export interface WithTTL {
  ttl?: number
  ttlInFutureDays?: number
}

// **** PARAMS

export function createKeyFromSource<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  { entity, metaAttributeNames: { pk, sk } }: EntityContext<TItem, TPKSource, TSKSource>,
  keySource: TPKSource & TSKSource
): DynamoDBValues {
  return {
    [pk]: entity.pk(keySource),
    ...(sk ? { [sk]: entity.sk(keySource) } : {})
  }
}

export function keyParamFromSource<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  keySource: TPKSource & TSKSource
) {
  return { Key: createKeyFromSource(context, keySource) }
}

export function tableNameParam({ tableName }: Pick<EntityContext<unknown, unknown, unknown>, 'tableName'>) {
  return { TableName: tableName }
}

export function conditionExpressionParam(condition?: Conditional) {
  const { conditionExpression } = condition ?? {}
  return conditionExpression
    ? {
        ConditionExpression: conditionExpression
      }
    : {}
}

export function expressionAttributeParams(
  expressionAttributeValues?: DynamoDBValues,
  expressionAttributeNames?: Record<string, string>
) {
  return {
    ...(expressionAttributeValues ? { ExpressionAttributeValues: expressionAttributeValues } : {}),
    ...(expressionAttributeNames ? { ExpressionAttributeNames: expressionAttributeNames } : {})
  }
}

export function expressionAttributeParamsFromOptions(attributeOptions?: WithExpression) {
  return expressionAttributeParams(
    attributeOptions?.expressionAttributeValues,
    attributeOptions?.expressionAttributeNames
  )
}

export function returnParamsForCapacityMetricsAndValues(
  options?: ReturnConsumedCapacityOption & ReturnItemCollectionMetricsOption & ReturnValuesOptions
) {
  return {
    ...returnConsumedCapacityParam(options),
    ...returnValuesParams(options),
    ...returnItemCollectionMetricsParam(options)
  }
}

export function returnConsumedCapacityParam(option?: ReturnConsumedCapacityOption) {
  return option?.returnConsumedCapacity ? { ReturnConsumedCapacity: option.returnConsumedCapacity } : {}
}

export function returnValuesParams(options?: ReturnValuesOptions) {
  return {
    ...(options?.returnValues ? { ReturnValues: options.returnValues } : {}),
    ...(options?.returnValuesOnConditionCheckFailure
      ? { ReturnValuesOnConditionCheckFailure: options.returnValuesOnConditionCheckFailure }
      : {})
  }
}

export function returnItemCollectionMetricsParam(option?: ReturnItemCollectionMetricsOption) {
  return option?.returnItemCollectionMetrics
    ? { ReturnItemCollectionMetrics: option.returnItemCollectionMetrics }
    : {}
}

export function determineTTL(clock: Clock, { ttl, ttlInFutureDays }: WithTTL = {}): number | undefined {
  return ttl ?? (ttlInFutureDays ? secondsTimestampInFutureDays(clock, ttlInFutureDays) : undefined)
}

// *** PARSING

export function parseItem<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  item: DynamoDBValues
): TItem {
  return context.entity.parse(item, context.allMetaAttributeNames, context.metaAttributeNames)
}

export function parseUnparsedReturnedAttributes(result: { Attributes?: DynamoDBValues }) {
  return result.Attributes ? { unparsedReturnedAttributes: result.Attributes } : {}
}

export function parseConsumedCapacityAndItemCollectionMetrics(
  result: Pick<DeleteItemOutput, 'ConsumedCapacity' | 'ItemCollectionMetrics'>
) {
  return result.ConsumedCapacity || result.ItemCollectionMetrics
    ? {
        metadata: {
          ...(result.ConsumedCapacity ? { consumedCapacity: result.ConsumedCapacity } : {}),
          ...(result.ItemCollectionMetrics ? { itemCollectionMetrics: result.ItemCollectionMetrics } : {})
        }
      }
    : {}
}
