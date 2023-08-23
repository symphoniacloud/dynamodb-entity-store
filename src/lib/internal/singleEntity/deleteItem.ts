import { parseAttributesCapacityAndMetrics } from '../operationsCommon'
import { EntityContext } from '../entityContext'
import { isDebugLoggingEnabled } from '../../util/logger'
import { DeleteCommandInput } from '@aws-sdk/lib-dynamodb'
import { DeleteOptions } from '../../operationOptions'
import { DeleteResponse } from '../../operationResponses'
import { deleteParams } from '../common/deleteCommon'

export async function deleteItem<
  TItem extends TPKSource & TSKSource,
  TKeySource extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  keySource: TKeySource,
  options?: DeleteOptions
): Promise<DeleteResponse> {
  const params = deleteParams(context, keySource, options)
  const result = await executeRequest(context, params)
  return parseAttributesCapacityAndMetrics(result)
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
