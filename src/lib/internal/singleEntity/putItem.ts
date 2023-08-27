import { PutCommandInput } from '@aws-sdk/lib-dynamodb'
import { EntityContext } from '../entityContext'
import { isDebugLoggingEnabled } from '../../util/logger'
import { putParams } from '../common/putCommon'
import { PutOptions } from '../../singleEntityOperations'

export async function putItem<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  item: TItem,
  options?: PutOptions
): Promise<TItem> {
  const params = putParams(context, item, options)
  await executeRequest(context, params)
  return item
}

export async function executeRequest<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  params: PutCommandInput
) {
  if (isDebugLoggingEnabled(context.logger)) {
    context.logger.debug(`Attempting to put ${context.entity.type}`, { params })
  }
  const result = await context.dynamoDB.put(params)
  if (isDebugLoggingEnabled(context.logger)) {
    context.logger.debug(`Put result`, { result })
  }
  return result
}
