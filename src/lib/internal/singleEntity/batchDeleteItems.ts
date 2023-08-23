import { EntityContext } from '../entityContext'
import { BatchDeleteOptions } from '../../operationOptions'
import { keyParamFromSource } from '../operationsCommon'
import { batchWrite, createWriteParamsBatches } from './batchWriteCommon'
import { BatchWriteCommandInput } from '@aws-sdk/lib-dynamodb'

export async function deleteItems<
  TItem extends TPKSource & TSKSource,
  TKeySource extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  keySources: TKeySource[],
  options?: BatchDeleteOptions
) {
  return await batchWrite(context, deleteParamsBatches(context, keySources, options))
}

export function deleteParamsBatches<
  TItem extends TPKSource & TSKSource,
  TKeySource extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  keySources: TKeySource[],
  options?: BatchDeleteOptions
): BatchWriteCommandInput[] {
  function toDeleteRequest(keySource: TKeySource) {
    return {
      DeleteRequest: keyParamFromSource(context, keySource)
    }
  }

  return createWriteParamsBatches(keySources, context.tableName, toDeleteRequest, options)
}
