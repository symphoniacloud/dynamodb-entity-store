import {
  AdvancedDeleteOptions,
  AdvancedGetOptions,
  AdvancedPutOptions,
  AdvancedUpdateOptions,
  BatchDeleteOptions,
  BatchGetOptions,
  BatchPutOptions
} from './advancedOperationOptions'
import {
  AdvancedBatchGetResponse,
  AdvancedBatchWriteResponse,
  AdvancedDeleteResponse,
  AdvancedGetOrThrowResponse,
  AdvancedGetResponse,
  AdvancedPutResponse,
  AdvancedUpdateResponse
} from './advancedOperationResponses'

export interface SingleEntityAdvancedOperations<TItem extends TPKSource & TSKSource, TPKSource, TSKSource> {
  put(item: TItem, options?: AdvancedPutOptions): Promise<AdvancedPutResponse>

  update<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options: AdvancedUpdateOptions
  ): Promise<AdvancedUpdateResponse>

  // TODO - integration tests
  getOrUndefined<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options?: AdvancedGetOptions
  ): Promise<AdvancedGetResponse<TItem, TPKSource, TSKSource>>

  // TODO - integration tests
  getOrThrow<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options?: AdvancedGetOptions
  ): Promise<AdvancedGetOrThrowResponse<TItem, TPKSource, TSKSource>>

  delete<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options?: AdvancedDeleteOptions
  ): Promise<AdvancedDeleteResponse>

  batchPut(item: TItem[], options?: BatchPutOptions): Promise<AdvancedBatchWriteResponse>

  batchDelete<TKeySource extends TPKSource & TSKSource>(
    keySources: TKeySource[],
    options?: BatchDeleteOptions
  ): Promise<AdvancedBatchWriteResponse>

  batchGet<TKeySource extends TPKSource & TSKSource>(
    keySources: TKeySource[],
    options?: BatchGetOptions
  ): Promise<AdvancedBatchGetResponse<TItem, TPKSource, TSKSource>>
}
