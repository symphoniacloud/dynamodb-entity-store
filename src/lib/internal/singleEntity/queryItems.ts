import { EntityContext } from '../entityContext'
import { executeQueryOrScan, parseResultsForEntity } from '../common/queryAndScanCommon'
import { configureQueryOperation } from '../common/queryCommon'
import { QueryCommandInput } from '@aws-sdk/lib-dynamodb'
import { OnePageResponse } from '../../singleEntityOperations'
import { QueryOptions } from '../../multipleEntityOperations'

export interface QueryCriteria {
  keyConditionExpression: string
  partialCriteria: Omit<
    QueryCommandInput,
    'KeyConditionExpression' | 'TableName' | 'ExclusiveStartKey' | 'Limit' | 'ScanIndexForward'
  >
}

export async function queryItemsPage<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  criteria: QueryCriteria,
  options: QueryOptions
): Promise<OnePageResponse<TItem>> {
  return await queryItems(context, criteria, options, false)
}

export async function queryAllItems<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  criteria: QueryCriteria,
  options: QueryOptions
): Promise<TItem[]> {
  return (await queryItems(context, criteria, options, true)).items
}

async function queryItems<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  { keyConditionExpression, partialCriteria }: QueryCriteria,
  { scanIndexForward, ...otherOptions }: QueryOptions,
  allPages: boolean
): Promise<OnePageResponse<TItem>> {
  const queryConfig = configureQueryOperation(context, otherOptions, allPages, {
    KeyConditionExpression: keyConditionExpression,
    ...partialCriteria,
    ...(scanIndexForward === false ? { ScanIndexForward: scanIndexForward } : {})
  })
  const result = await executeQueryOrScan(queryConfig, context.logger, context.entity.type)
  return parseResultsForEntity(context, result)
}
