import { PutCommandInput } from '@aws-sdk/lib-dynamodb'
import { EntityContext } from '../../entityContext'
import { isDebugLoggingEnabled } from '../../../util/logger'
import { advancedPutParams } from './putCommon'
import { AdvancedPutResponse } from '../../../advanced/advancedOperationResponses'
import { AdvancedPutOptions } from '../../../advanced/advancedOperationOptions'
import { parseAttributesCapacityAndMetrics } from './advancedCommon'

export async function advancedPutItem<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  item: TItem,
  options?: AdvancedPutOptions
): Promise<AdvancedPutResponse> {
  const params = advancedPutParams(context, item, options)
  const result = await executeRequest(context, params)
  return parseAttributesCapacityAndMetrics(result)
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
