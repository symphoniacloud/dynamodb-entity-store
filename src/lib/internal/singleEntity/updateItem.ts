import { parseAttributesCapacityAndMetrics } from '../operationsCommon'
import { EntityContext } from '../entityContext'
import { isDebugLoggingEnabled } from '../../util/logger'
import { UpdateOptions } from '../../operationOptions'
import { UpdateResponse } from '../../operationResponses'
import { createUpdateParams } from '../common/updateCommon'
import { UpdateCommandInput } from '@aws-sdk/lib-dynamodb'

export async function updateItem<
  TItem extends TPKSource & TSKSource,
  TKeySource extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  keySource: TKeySource,
  options: UpdateOptions
): Promise<UpdateResponse> {
  const params = createUpdateParams(context, keySource, options)
  const result = await executeRequest(context, params)
  return parseAttributesCapacityAndMetrics(result)
}

export async function executeRequest<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  params: UpdateCommandInput
) {
  if (isDebugLoggingEnabled(context.logger)) {
    context.logger.debug(`Attempting to update ${context.entity.type}`, { updateParams: params })
  }
  const result = await context.dynamoDB.update(params)
  if (isDebugLoggingEnabled(context.logger)) {
    context.logger.debug(`Update result`, { result })
  }
  return result
}
