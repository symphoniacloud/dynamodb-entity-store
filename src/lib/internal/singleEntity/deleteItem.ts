import { DeleteCommandInput } from '@aws-sdk/lib-dynamodb'
import { EntityContext } from '../entityContext'
import { deleteParams } from '../common/deleteCommon'
import { isDebugLoggingEnabled } from '../../util'
import { parseAttributesCapacityAndMetrics } from './singleEntityCommon'
import { AdvancedDeleteOptions, AdvancedDeleteResponse } from '../../singleEntityAdvancedOperations'
import { returnParamsForCapacityMetricsAndValues } from '../common/operationsCommon'

export async function deleteItem<
  TItem extends TPKSource & TSKSource,
  TKeySource extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  keySource: TKeySource,
  options?: AdvancedDeleteOptions
): Promise<AdvancedDeleteResponse> {
  const params = {
    ...deleteParams(context, keySource, options),
    ...returnParamsForCapacityMetricsAndValues(options)
  }

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
