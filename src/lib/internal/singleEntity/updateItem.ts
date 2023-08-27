import { EntityContext } from '../entityContext'
import { isDebugLoggingEnabled } from '../../util/logger'
import { createUpdateParams } from '../common/updateCommon'
import { UpdateCommandInput } from '@aws-sdk/lib-dynamodb'
import { UpdateOptions } from '../../singleEntityOperations'

export async function updateItem<
  TItem extends TPKSource & TSKSource,
  TKeySource extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  keySource: TKeySource,
  options: UpdateOptions
): Promise<void> {
  const params = createUpdateParams(context, keySource, options)
  await executeRequest(context, params)
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
