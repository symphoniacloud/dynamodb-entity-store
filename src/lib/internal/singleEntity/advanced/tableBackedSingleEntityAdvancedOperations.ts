import {
  AdvancedBatchGetResponse,
  AdvancedBatchWriteResponse,
  AdvancedDeleteOptions,
  AdvancedDeleteResponse,
  AdvancedGetOptions,
  AdvancedGetOrThrowResponse,
  AdvancedGetResponse,
  AdvancedPutOptions,
  AdvancedPutResponse,
  AdvancedUpdateOptions,
  AdvancedUpdateResponse,
  BatchDeleteOptions,
  BatchGetOptions,
  BatchPutOptions,
  SingleEntityAdvancedOperations
} from '../../../advanced'
import { CompleteTableParams, createEntityContext, EntityContext } from '../../entityContext'
import { Entity } from '../../../entities'
import { advancedPutItem } from './advancedPutItem'
import { advancedGetItem } from './advancedGetItem'
import { advancedUpdateItem } from './advancedUpdateItem'
import { advancedDeleteItem } from './advancedDeleteItem'
import { batchPutItems } from '../batchPutItems'
import { deleteItems } from '../batchDeleteItems'
import { getItems } from '../batchGetItems'

export function tableBackedSingleEntityAdvancedOperations<
  TItem extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  table: CompleteTableParams,
  entity: Entity<TItem, TPKSource, TSKSource>
): SingleEntityAdvancedOperations<TItem, TPKSource, TSKSource> {
  // TODO - consider caching this for performance
  const entityContext: EntityContext<TItem, TPKSource, TSKSource> = createEntityContext(table, entity)

  return {
    async put(item: TItem, options?: AdvancedPutOptions): Promise<AdvancedPutResponse> {
      return await advancedPutItem(entityContext, item, options)
    },
    async update<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options: AdvancedUpdateOptions
    ): Promise<AdvancedUpdateResponse> {
      return await advancedUpdateItem(entityContext, keySource, options)
    },

    async getOrUndefined<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: AdvancedGetOptions
    ): Promise<AdvancedGetResponse<TItem, TPKSource, TSKSource>> {
      return await advancedGetItem(entityContext, keySource, options)
    },
    async getOrThrow<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: AdvancedGetOptions
    ): Promise<AdvancedGetOrThrowResponse<TItem, TPKSource, TSKSource>> {
      const { item, ...restOfResponse } = await advancedGetItem(entityContext, keySource, options)
      if (item) return { item, ...restOfResponse }
      throw new Error(
        `Unable to find item for entity [${entity.type}] with key source ${JSON.stringify(keySource)}`
      )
    },
    async delete<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: AdvancedDeleteOptions
    ): Promise<AdvancedDeleteResponse> {
      return await advancedDeleteItem(entityContext, keySource, options)
    },

    async batchPut(items: TItem[], options?: BatchPutOptions): Promise<AdvancedBatchWriteResponse> {
      return await batchPutItems(entityContext, items, options)
    },

    async batchDelete<TKeySource extends TPKSource & TSKSource>(
      keySources: TKeySource[],
      options?: BatchDeleteOptions
    ): Promise<AdvancedBatchWriteResponse> {
      return await deleteItems(entityContext, keySources, options)
    },

    async batchGet<TKeySource extends TPKSource & TSKSource>(
      keySources: TKeySource[],
      options?: BatchGetOptions
    ): Promise<AdvancedBatchGetResponse<TItem, TPKSource, TSKSource>> {
      return await getItems(entityContext, keySources, options)
    }
  }
}
