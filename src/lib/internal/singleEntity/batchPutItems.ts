import { EntityContext } from '../entityContext'
import { batchWrite, createWriteParamsBatches } from './batchWriteCommon'
import { BatchWriteCommandInput } from '@aws-sdk/lib-dynamodb'

import { itemParam } from '../common/putCommon'
import { BatchPutOptions } from '../../advanced/advancedOperationOptions'

export async function batchPutItems<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  items: TItem[],
  options?: BatchPutOptions
) {
  return await batchWrite(context, putParamsBatches(context, items, options))
}

export function putParamsBatches<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  items: TItem[],
  options?: BatchPutOptions
): BatchWriteCommandInput[] {
  function toPutRequest(item: TItem) {
    return {
      PutRequest: {
        ...itemParam(context, item, options)
      }
    }
  }

  return createWriteParamsBatches(items, context.tableName, toPutRequest, options)
}
