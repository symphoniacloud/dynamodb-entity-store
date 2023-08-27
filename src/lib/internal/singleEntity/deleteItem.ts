import { EntityContext } from '../entityContext'
import { isDebugLoggingEnabled } from '../../util/logger'
import { DeleteCommandInput } from '@aws-sdk/lib-dynamodb'
import { deleteParams } from '../common/deleteCommon'
import { DeleteOptions } from '../../singleEntityOperations'

export async function deleteItem<
  TItem extends TPKSource & TSKSource,
  TKeySource extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  keySource: TKeySource,
  options?: DeleteOptions
): Promise<void> {
  const params = deleteParams(context, keySource, options)
  await executeRequest(context, params)
}

export async function executeRequest<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  params: DeleteCommandInput
) {
  if (isDebugLoggingEnabled(context.logger)) {
    context.logger.debug(`Attempting to delete ${context.entity.type}`, { params })
  }
  const result = await context.dynamoDB.delete(params)
  if (isDebugLoggingEnabled(context.logger)) {
    context.logger.debug(`Delete result`, { result })
  }
  return result
}
