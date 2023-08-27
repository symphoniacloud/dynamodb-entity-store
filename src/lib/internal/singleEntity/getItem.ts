import { keyParamFromSource, parseItem, tableNameParam } from '../operationsCommon'
import { EntityContext } from '../entityContext'
import { isDebugLoggingEnabled } from '../../util/logger'
import { GetCommandInput, GetCommandOutput } from '@aws-sdk/lib-dynamodb'

import { GetOptions } from '../../singleEntityOperations'

export async function getItem<
  TItem extends TPKSource & TSKSource,
  TKeySource extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  keySource: TKeySource,
  options?: GetOptions
): Promise<TItem | undefined> {
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
  options?: GetOptions
): GetCommandInput {
  return {
    ...tableNameParam(context),
    ...keyParamFromSource(context, keySource),
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
  return unparsedItem ? parseItem(context, unparsedItem) : unparsedItem
}
