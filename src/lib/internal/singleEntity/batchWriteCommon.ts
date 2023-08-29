import { EntityContext } from '../entityContext'
import { chunk, isDebugLoggingEnabled, removeNullOrUndefined } from '../../util'
import { BatchWriteCommandInput, BatchWriteCommandOutput } from '@aws-sdk/lib-dynamodb'
import { DynamoDBValues } from '../../entities'
import { returnConsumedCapacityParam, returnItemCollectionMetricsParam } from '../operationsCommon'
import {
  AdvancedBatchWriteResponse,
  BatchDeleteOptions,
  BatchPutOptions,
  ConsumedCapacitiesMetadata,
  ItemCollectionMetricsCollectionMetadata
} from '../../singleEntityAdvancedOperations'

export const DEFAULT_AND_MAX_BATCH_WRITE_SIZE = 25
export const DEFAULT_AND_MAX_BATCH_READ_SIZE = 100

export function createWriteParamsBatches<T>(
  allItems: T[],
  tableName: string,
  generateRequest: (item: T) => {
    DeleteRequest?: { Key: DynamoDBValues }
    PutRequest?: { Item: DynamoDBValues }
  },
  options?: BatchDeleteOptions | BatchPutOptions
): BatchWriteCommandInput[] {
  return chunk(allItems, options?.batchSize ?? DEFAULT_AND_MAX_BATCH_WRITE_SIZE).map((batch) => {
    return {
      RequestItems: {
        [tableName]: batch.map(generateRequest)
      },
      ...returnConsumedCapacityParam(options),
      ...returnItemCollectionMetricsParam(options)
    }
  })
}

// TODO - unprocessed items need testing (either integration if we can force it, or unit)
export async function batchWrite<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  paramsBatches: BatchWriteCommandInput[]
): Promise<AdvancedBatchWriteResponse> {
  const results: BatchWriteCommandOutput[] = []

  for (const batch of paramsBatches) {
    if (isDebugLoggingEnabled(context.logger)) {
      context.logger.debug(`Attempting to write batch ${context.entity.type}`, { batch })
    }
    const result = await context.dynamoDB.batchWrite(batch)
    results.push(result)
    if (isDebugLoggingEnabled(context.logger)) {
      context.logger.debug(`Write batch result`, { result })
    }
  }

  // Ignores the table on UnprocessedItems since this operation is in the context of only using one table
  const unprocessedItems = results
    .map((r) => (r.UnprocessedItems ? Object.values(r.UnprocessedItems) : []))
    .flat(2)

  const consumedCapacities = removeNullOrUndefined(results.map((r) => r.ConsumedCapacity)).flat()
  const allItemCollectionMetrics = removeNullOrUndefined(results.map((r) => r.ItemCollectionMetrics))

  const metadata: ConsumedCapacitiesMetadata & ItemCollectionMetricsCollectionMetadata = {
    ...(consumedCapacities.length > 0 ? { consumedCapacities: consumedCapacities } : {}),
    ...(allItemCollectionMetrics.length > 0
      ? { itemCollectionMetricsCollection: allItemCollectionMetrics }
      : {})
  }
  return {
    ...(unprocessedItems.length > 0 ? { unprocessedItems } : {}),
    ...(metadata.consumedCapacities || metadata.itemCollectionMetricsCollection ? { metadata } : {})
  }
}
