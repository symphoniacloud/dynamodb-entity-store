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
  SkQueryRange,
  UpdateOptions
} from './operationOptions'
import {
  BatchGetResponse,
  BatchWriteResponse,
  CollectionResponse,
  DeleteResponse,
  GetOrThrowResponse,
  GetResponse,
  PutResponse,
  UpdateResponse
} from './operationResponses'

export interface SingleEntityOperations<TItem extends TPKSource & TSKSource, TPKSource, TSKSource> {
  put(item: TItem, options?: PutOptions): Promise<PutResponse>

  update<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options: UpdateOptions
  ): Promise<UpdateResponse>

  getOrUndefined<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options?: GetOptions
  ): Promise<GetResponse<TItem, TPKSource, TSKSource>>

  getOrThrow<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options?: GetOptions
  ): Promise<GetOrThrowResponse<TItem, TPKSource, TSKSource>>

  delete<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options?: DeleteOptions
  ): Promise<DeleteResponse>

  query(options?: QueryOptions): QueryBy<TItem, TPKSource>

  queryWithGsi<TGSIPKSource>(options?: GsiQueryOptions): QueryBy<TItem, TGSIPKSource>

  scan(options?: QueryAndScanOptions): Promise<CollectionResponse<TItem>>

  batchPut(item: TItem[], options?: BatchPutOptions): Promise<BatchWriteResponse>

  batchDelete<TKeySource extends TPKSource & TSKSource>(
    keySources: TKeySource[],
    options?: BatchDeleteOptions
  ): Promise<BatchWriteResponse>

  batchGet<TKeySource extends TPKSource & TSKSource>(
    keySources: TKeySource[],
    options?: BatchGetOptions
  ): Promise<BatchGetResponse<TItem, TPKSource, TSKSource>>
}

export interface QueryBy<TItem, TQueryPK> {
  byPk(source: TQueryPK): Promise<CollectionResponse<TItem>>

  byPkAndSk(source: TQueryPK, queryRange: SkQueryRange): Promise<CollectionResponse<TItem>>
}
