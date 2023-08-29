import {
  keyParamFromSource,
  parseItem,
  returnConsumedCapacityParam,
  tableNameParam
} from '../operationsCommon'
import { EntityContext } from '../entityContext'
import { isDebugLoggingEnabled } from '../../util'
import { GetCommandInput, GetCommandOutput } from '@aws-sdk/lib-dynamodb'
import { AdvancedGetOptions, AdvancedGetResponse } from '../../singleEntityAdvancedOperations'

export async function getItem<
  TItem extends TPKSource & TSKSource,
  TKeySource extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  keySource: TKeySource,
  options?: AdvancedGetOptions
): Promise<AdvancedGetResponse<TItem, TPKSource, TSKSource>> {
  const params = createGetItemParams(context, keySource, options)
  const result = await executeRequest(context, params)
  return parseResult(context, result)
}

export function createGetItemParams<
  TItem extends TPKSource & TSKSource,
  TKeySource extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  keySource: TKeySource,
  options?: AdvancedGetOptions
): GetCommandInput {
  return {
    ...tableNameParam(context),
    ...keyParamFromSource(context, keySource),
    ...returnConsumedCapacityParam(options),
    ...(options?.consistentRead !== undefined ? { ConsistentRead: options.consistentRead } : {})
  }
}

export async function executeRequest<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  params: GetCommandInput
) {
  if (isDebugLoggingEnabled(context.logger)) {
    context.logger.debug(`Attempting to get ${context.entity.type}`, { params })
  }
  const result = await context.dynamoDB.get(params)
  if (isDebugLoggingEnabled(context.logger)) {
    context.logger.debug(`Get result`, { getResult: result })
  }
  return result
}

export function parseResult<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  result: GetCommandOutput
) {
  const unparsedItem = result.Item
  return {
    item: unparsedItem ? parseItem(context, unparsedItem) : unparsedItem,
    ...(result.ConsumedCapacity ? { metadata: { consumedCapacity: result.ConsumedCapacity } } : {})
  }
}
