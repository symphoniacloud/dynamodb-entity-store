import {
  AdvancedBatchGetResponse,
  AdvancedBatchWriteResponse,
  AdvancedCollectionResponse,
  AdvancedDeleteOptions,
  AdvancedDeleteResponse,
  AdvancedGetOptions,
  AdvancedGetOrThrowResponse,
  AdvancedGetResponse,
  AdvancedGsiQueryAllOptions,
  AdvancedGsiQueryOnePageOptions,
  AdvancedGsiScanAllOptions,
  AdvancedGsiScanOnePageOptions,
  AdvancedPutOptions,
  AdvancedPutResponse,
  AdvancedQueryAllOptions,
  AdvancedQueryOnePageOptions,
  AdvancedScanAllOptions,
  AdvancedScanOnePageOptions,
  AdvancedUpdateOptions,
  AdvancedUpdateResponse,
  BatchDeleteOptions,
  BatchGetOptions,
  BatchPutOptions,
  SingleEntityAdvancedOperations
} from '../../singleEntityAdvancedOperations'
import { EntityContextParams, EntityContext } from '../entityContext'
import { Entity } from '../../entities'
import { putItem } from './putItem'
import { getItem } from './getItem'
import { updateItem } from './updateItem'
import { deleteItem } from './deleteItem'
import { batchPutItems } from './batchPutItems'
import { deleteItems } from './batchDeleteItems'
import { getItems } from './batchGetItems'
import {
  gsiPkQueryCriteria,
  gsiSkRangeQueryCriteria,
  pkQueryCriteria,
  queryItems,
  skRangeQueryCriteria
} from './queryItems'
import { SkQueryRange } from '../../singleEntityOperations'
import { findGsiDetails } from '../common/gsiQueryCommon'
import { scanItems } from './scanItems'

export function tableBackedSingleEntityAdvancedOperations<
  TItem extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  context: EntityContextParams,
  entity: Entity<TItem, TPKSource, TSKSource>,
  entityContext: EntityContext<TItem, TPKSource, TSKSource>
): SingleEntityAdvancedOperations<TItem, TPKSource, TSKSource> {
  function checkAllowScans() {
    if (context.table.allowScans === undefined || !context.table.allowScans)
      throw new Error('Scan operations are disabled for this store')
  }

  return {
    async put(item: TItem, options?: AdvancedPutOptions): Promise<AdvancedPutResponse> {
      return await putItem(entityContext, item, options)
    },
    async update<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options: AdvancedUpdateOptions
    ): Promise<AdvancedUpdateResponse> {
      return await updateItem(entityContext, keySource, options)
    },

    async getOrUndefined<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: AdvancedGetOptions
    ): Promise<AdvancedGetResponse<TItem, TPKSource, TSKSource>> {
      return await getItem(entityContext, keySource, options)
    },
    async getOrThrow<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: AdvancedGetOptions
    ): Promise<AdvancedGetOrThrowResponse<TItem, TPKSource, TSKSource>> {
      const { item, ...restOfResponse } = await getItem(entityContext, keySource, options)
      if (item) return { item, ...restOfResponse }
      throw new Error(
        `Unable to find item for entity [${entity.type}] with key source ${JSON.stringify(keySource)}`
      )
    },
    async delete<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: AdvancedDeleteOptions
    ): Promise<AdvancedDeleteResponse> {
      return await deleteItem(entityContext, keySource, options)
    },

    async queryAllByPk(
      pkSource: TPKSource,
      options: AdvancedQueryAllOptions = {}
    ): Promise<AdvancedCollectionResponse<TItem>> {
      return await queryItems(entityContext, pkQueryCriteria(entityContext, pkSource), options, true)
    },

    async queryOnePageByPk(
      pkSource: TPKSource,
      options: AdvancedQueryOnePageOptions = {}
    ): Promise<AdvancedCollectionResponse<TItem>> {
      return await queryItems(entityContext, pkQueryCriteria(entityContext, pkSource), options, false)
    },

    async queryAllByPkAndSk(
      pkSource: TPKSource,
      queryRange: SkQueryRange,
      options: AdvancedQueryAllOptions = {}
    ): Promise<AdvancedCollectionResponse<TItem>> {
      return await queryItems(
        entityContext,
        skRangeQueryCriteria(entityContext, pkSource, queryRange),
        options,
        true
      )
    },

    async queryOnePageByPkAndSk(
      pkSource: TPKSource,
      queryRange: SkQueryRange,
      options: AdvancedQueryOnePageOptions = {}
    ) {
      return await queryItems(
        entityContext,
        skRangeQueryCriteria(entityContext, pkSource, queryRange),
        options,
        false
      )
    },

    async queryAllWithGsiByPk<TGSIPKSource>(
      pkSource: TGSIPKSource,
      options: AdvancedGsiQueryAllOptions = {}
    ) {
      const gsiDetails = findGsiDetails(entityContext, options)
      return await queryItems(entityContext, gsiPkQueryCriteria(gsiDetails, pkSource), options, true)
    },

    async queryOnePageWithGsiByPk<TGSIPKSource>(
      pkSource: TGSIPKSource,
      options: AdvancedGsiQueryOnePageOptions = {}
    ) {
      const gsiDetails = findGsiDetails(entityContext, options)
      return await queryItems(entityContext, gsiPkQueryCriteria(gsiDetails, pkSource), options, false)
    },

    async queryAllWithGsiByPkAndSk<TGSIPKSource>(
      pkSource: TGSIPKSource,
      queryRange: SkQueryRange,
      options: AdvancedGsiQueryAllOptions = {}
    ) {
      const gsiDetails = findGsiDetails(entityContext, options)
      return await queryItems(
        entityContext,
        gsiSkRangeQueryCriteria(gsiDetails, pkSource, queryRange),
        options,
        true
      )
    },

    async queryOnePageWithGsiByPkAndSk<TGSIPKSource>(
      pkSource: TGSIPKSource,
      queryRange: SkQueryRange,
      options: AdvancedGsiQueryOnePageOptions = {}
    ) {
      const gsiDetails = findGsiDetails(entityContext, options)
      return await queryItems(
        entityContext,
        gsiSkRangeQueryCriteria(gsiDetails, pkSource, queryRange),
        options,
        false
      )
    },

    async scanAll(options: AdvancedScanAllOptions = {}) {
      checkAllowScans()
      return await scanItems(entityContext, options, true)
    },

    async scanOnePage(options: AdvancedScanOnePageOptions = {}) {
      checkAllowScans()
      return await scanItems(entityContext, options, false)
    },

    async scanAllWithGsi(options: AdvancedGsiScanAllOptions = {}) {
      checkAllowScans()
      return await scanItems(entityContext, options, true, findGsiDetails(entityContext, options))
    },

    async scanOnePageWithGsi(options: AdvancedGsiScanOnePageOptions = {}) {
      checkAllowScans()
      return await scanItems(entityContext, options, false, findGsiDetails(entityContext, options))
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
