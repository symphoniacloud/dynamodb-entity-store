import { EntityContext } from '../entityContext'
import { isDebugLoggingEnabled } from '../../util/logger'
import { chunk, removeNullOrUndefined } from '../../util/collections'
import { DEFAULT_AND_MAX_BATCH_READ_SIZE } from './batchWriteCommon'
import { createKeyFromSource, parseItem, returnConsumedCapacityParam } from '../operationsCommon'
import { BatchGetCommandInput, BatchGetCommandOutput } from '@aws-sdk/lib-dynamodb'
import { AdvancedBatchGetResponse } from '../../advanced/advancedOperationResponses'
import { BatchGetOptions } from '../../advanced/advancedOperationOptions'

export async function getItems<
  TItem extends TPKSource & TSKSource,
  TKeySource extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  keySources: TKeySource[],
  options?: BatchGetOptions
): Promise<AdvancedBatchGetResponse<TItem, TPKSource, TSKSource>> {
  const batchesParams = createBatchesParams(context, keySources, options)
  const results = await executeAllBatches(context, batchesParams)
  return parseBatchResults(context, results)
}

// TODO - unit test consistent read is getting set
export function createBatchesParams<
  TItem extends TPKSource & TSKSource,
  TKeySource extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  keySources: TKeySource[],
  options?: BatchGetOptions
): BatchGetCommandInput[] {
  return chunk(keySources, options?.batchSize ?? DEFAULT_AND_MAX_BATCH_READ_SIZE).map((batch) => {
    return {
      RequestItems: {
        [context.tableName]: {
          Keys: batch.map((keySource: TKeySource) => createKeyFromSource(context, keySource)),
          ...(options?.consistentRead !== undefined ? { ConsistentRead: options.consistentRead } : {})
        }
      },
      ...returnConsumedCapacityParam(options)
    }
  })
}

export async function executeAllBatches<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  patchesParams: BatchGetCommandInput[]
): Promise<BatchGetCommandOutput[]> {
  const results: BatchGetCommandOutput[] = []
  for (const batch of patchesParams) {
    if (isDebugLoggingEnabled(context.logger)) {
      context.logger.debug(`Attempting to get batch ${context.entity.type}`, { batch })
    }
    const result = await context.dynamoDB.batchGet(batch)
    if (isDebugLoggingEnabled(context.logger)) {
      context.logger.debug(`Get batch result`, { result })
    }
    results.push(result)
  }
  return results
}

// TODO - unprocessed items need testing (either integration if we can force it, or unit)
export function parseBatchResults<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  results: BatchGetCommandOutput[]
): AdvancedBatchGetResponse<TItem, TPKSource, TSKSource> {
  const items = results
    .map((r) => Object.values(r.Responses ?? {}))
    .flat(2)
    .map((item) => parseItem(context, item))

  const unprocessedKeys = results
    .map((r) => {
      return Object.values(r.UnprocessedKeys ?? {}).map((unprocessed) => unprocessed.Keys ?? [])
    })
    .flat(2)

  const consumedCapacities = removeNullOrUndefined(results.map((r) => r.ConsumedCapacity)).flat()

  return {
    items,
    ...(unprocessedKeys.length > 0 ? { unprocessedKeys } : {}),
    ...(consumedCapacities.length > 0 ? { metadata: { consumedCapacities } } : {})
  }
}
