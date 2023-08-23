import { CompleteTableParams, createEntityContext, EntityContext } from '../entityContext'
import { Entity } from '../../entities'
import { putItem } from './putItem'
import { getItem } from './getItem'
import { deleteItem } from './deleteItem'
import { queryByGsi } from './queryByGsi'
import { scanItems } from './scanItems'
import { updateItem } from './updateItem'
import { QueryBy, SingleEntityOperations } from '../../singleEntityOperations'
import {
  BatchDeleteOptions,
  BatchGetOptions,
  BatchPutOptions,
  DeleteOptions,
  GetOptions,
  GsiQueryOptions,
  PutOptions,
  QueryAndScanOptions,
  QueryOptions,
  UpdateOptions
} from '../../operationOptions'
import {
  BatchGetResponse,
  BatchWriteResponse,
  DeleteResponse,
  GetOrThrowResponse,
  GetResponse,
  PutResponse,
  UpdateResponse
} from '../../operationResponses'
import { getItems } from './batchGetItems'
import { batchPutItems } from './batchPutItems'
import { deleteItems } from './batchDeleteItems'
import { queryByTable } from './queryByTable'

export function tableBackedSingleEntityOperations<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  table: CompleteTableParams,
  entity: Entity<TItem, TPKSource, TSKSource>
): SingleEntityOperations<TItem, TPKSource, TSKSource> {
  // TODO - consider caching this for performance
  const entityContext: EntityContext<TItem, TPKSource, TSKSource> = createEntityContext(table, entity)

  return {
    async put(item: TItem, options?: PutOptions): Promise<PutResponse> {
      return await putItem(entityContext, item, options)
    },
    async update<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options: UpdateOptions
    ): Promise<UpdateResponse> {
      return await updateItem(entityContext, keySource, options)
    },
    async getOrUndefined<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: GetOptions
    ): Promise<GetResponse<TItem, TPKSource, TSKSource>> {
      return await getItem(entityContext, keySource, options)
    },
    async getOrThrow<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: GetOptions
    ): Promise<GetOrThrowResponse<TItem, TPKSource, TSKSource>> {
      const { item, ...restOfResponse } = await getItem(entityContext, keySource, options)
      if (item) return { item, ...restOfResponse }
      throw new Error(
        `Unable to find item for entity [${entity.type}] with key source ${JSON.stringify(keySource)}`
      )
    },
    async delete<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: DeleteOptions
    ): Promise<DeleteResponse> {
      return await deleteItem(entityContext, keySource, options)
    },
    async batchPut(items: TItem[], options?: BatchPutOptions): Promise<BatchWriteResponse> {
      return await batchPutItems(entityContext, items, options)
    },
    async batchDelete<TKeySource extends TPKSource & TSKSource>(
      keySources: TKeySource[],
      options?: BatchDeleteOptions
    ): Promise<BatchWriteResponse> {
      return await deleteItems(entityContext, keySources, options)
    },
    async batchGet<TKeySource extends TPKSource & TSKSource>(
      keySources: TKeySource[],
      options?: BatchGetOptions
    ): Promise<BatchGetResponse<TItem, TPKSource, TSKSource>> {
      return await getItems(entityContext, keySources, options)
    },
    query(options?: QueryOptions): QueryBy<TItem, TPKSource> {
      return queryByTable(entityContext, options ?? {})
    },
    queryWithGsi<TGSIPKSource>(options?: GsiQueryOptions): QueryBy<TItem, TGSIPKSource> {
      return queryByGsi(entityContext, options ?? {})
    },
    async scan(options?: QueryAndScanOptions) {
      if (!table.allowScans) throw new Error('Scan operations are disabled for this store')
      return await scanItems(entityContext, options ?? {})
    }
  }
}
