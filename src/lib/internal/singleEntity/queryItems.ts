import { EntityContext } from '../entityContext'
import { QueryOptions } from '../../operationOptions'
import { CollectionResponse } from '../../operationResponses'
import { parseResultsForEntity, executeQueryOrScan } from '../common/queryAndScanCommon'
import { configureQueryOperation } from '../common/queryCommon'
import { QueryCommandInput } from '@aws-sdk/lib-dynamodb'

export interface QueryCriteria {
  keyConditionExpression: string
  partialCriteria: Omit<
    QueryCommandInput,
    'KeyConditionExpression' | 'TableName' | 'ExclusiveStartKey' | 'Limit' | 'ScanIndexForward'
  >
}

export async function queryItems<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  { keyConditionExpression, partialCriteria }: QueryCriteria,
  { scanIndexForward, ...otherOptions }: QueryOptions
): Promise<CollectionResponse<TItem>> {
  const queryConfig = configureQueryOperation(context, otherOptions, {
    KeyConditionExpression: keyConditionExpression,
    ...partialCriteria,
    ...(scanIndexForward === false ? { ScanIndexForward: scanIndexForward } : {})
  })
  const result = await executeQueryOrScan(queryConfig, context.logger, context.entity.type)
  return parseResultsForEntity(context, result)
}
