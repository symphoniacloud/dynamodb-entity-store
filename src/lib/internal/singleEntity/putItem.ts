import { PutCommandInput } from '@aws-sdk/lib-dynamodb'
import { EntityContext } from '../entityContext'
import { isDebugLoggingEnabled } from '../../util'
import { parseAttributesCapacityAndMetrics } from './singleEntityCommon'
import { AdvancedPutOptions, AdvancedPutResponse } from '../../singleEntityAdvancedOperations'
import { putParams } from '../common/putCommon'
import { returnParamsForCapacityMetricsAndValues } from '../common/operationsCommon'

export async function putItem<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  item: TItem,
  options?: AdvancedPutOptions
): Promise<AdvancedPutResponse> {
  const params = {
    ...putParams(context, item, options),
    ...returnParamsForCapacityMetricsAndValues(options)
  }
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
