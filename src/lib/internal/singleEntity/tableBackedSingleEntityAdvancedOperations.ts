import {
  AdvancedDeleteOptions,
  AdvancedGetOptions,
  AdvancedGsiQueryAllOptions,
  AdvancedGsiQueryOnePageOptions,
  AdvancedGsiScanAllOptions,
  AdvancedGsiScanOnePageOptions,
  AdvancedPutOptions,
  AdvancedQueryAllOptions,
  AdvancedQueryOnePageOptions,
  AdvancedScanAllOptions,
  AdvancedScanOnePageOptions,
  AdvancedUpdateOptions,
  BatchDeleteOptions,
  BatchGetOptions,
  BatchPutOptions,
  SingleEntityAdvancedOperations
} from '../../singleEntityAdvancedOperations'
import { EntityContext } from '../entityContext'
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
  entityContext: EntityContext<TItem, TPKSource, TSKSource>
): SingleEntityAdvancedOperations<TItem, TPKSource, TSKSource> {
  async function queryByPk(pkSource: TPKSource, allPages: boolean, options: AdvancedQueryAllOptions = {}) {
    return queryItems(entityContext, pkQueryCriteria(entityContext, pkSource), allPages, options)
  }

  async function queryByPkAndSk(
    pkSource: TPKSource,
    queryRange: SkQueryRange,
    allPages: boolean,
    options: AdvancedQueryAllOptions = {}
  ) {
    return queryItems(
      entityContext,
      skRangeQueryCriteria(entityContext, pkSource, queryRange),
      allPages,
      options
    )
  }

  async function queryGsiByPk<TGSIPKSource>(
    pkSource: TGSIPKSource,
    allPages: boolean,
    options: AdvancedGsiQueryAllOptions = {}
  ) {
    const gsiDetails = findGsiDetails(entityContext, options)
    return await queryItems(entityContext, gsiPkQueryCriteria(gsiDetails, pkSource), allPages, options)
  }

  async function queryGsiByPkAndSk<TGSIPKSource>(
    pkSource: TGSIPKSource,
    queryRange: SkQueryRange,
    allPages: boolean,
    options: AdvancedGsiQueryAllOptions = {}
  ) {
    const gsiDetails = findGsiDetails(entityContext, options)
    return await queryItems(
      entityContext,
      gsiSkRangeQueryCriteria(gsiDetails, pkSource, queryRange),
      allPages,
      options
    )
  }

  return {
    async put(item: TItem, options?: AdvancedPutOptions) {
      return putItem(entityContext, item, options)
    },
    async update<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options: AdvancedUpdateOptions = {}
    ) {
      return updateItem(entityContext, keySource, options)
    },
    async getOrUndefined<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: AdvancedGetOptions
    ) {
      return getItem(entityContext, keySource, options)
    },
    async getOrThrow<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: AdvancedGetOptions
    ) {
      const { item, ...restOfResponse } = await getItem(entityContext, keySource, options)
      if (item) return { item, ...restOfResponse }
      throw new Error(
        `Unable to find item for entity [${entityContext.entity.type}] with key source ${JSON.stringify(
          keySource
        )}`
      )
    },
    async delete<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: AdvancedDeleteOptions
    ) {
      return deleteItem(entityContext, keySource, options)
    },
    async queryAllByPk(pkSource: TPKSource, options?: AdvancedQueryAllOptions) {
      return queryByPk(pkSource, true, options)
    },
    async queryOnePageByPk(pkSource: TPKSource, options?: AdvancedQueryOnePageOptions) {
      return queryByPk(pkSource, false, options)
    },
    async queryAllByPkAndSk(
      pkSource: TPKSource,
      queryRange: SkQueryRange,
      options?: AdvancedQueryAllOptions
    ) {
      return queryByPkAndSk(pkSource, queryRange, true, options)
    },
    async queryOnePageByPkAndSk(
      pkSource: TPKSource,
      queryRange: SkQueryRange,
      options?: AdvancedQueryOnePageOptions
    ) {
      return queryByPkAndSk(pkSource, queryRange, false, options)
    },
    async queryAllWithGsiByPk<TGSIPKSource>(pkSource: TGSIPKSource, options?: AdvancedGsiQueryAllOptions) {
      return queryGsiByPk(pkSource, true, options)
    },
    async queryOnePageWithGsiByPk<TGSIPKSource>(
      pkSource: TGSIPKSource,
      options?: AdvancedGsiQueryOnePageOptions
    ) {
      return queryGsiByPk(pkSource, false, options)
    },
    async queryAllWithGsiByPkAndSk<TGSIPKSource>(
      pkSource: TGSIPKSource,
      queryRange: SkQueryRange,
      options?: AdvancedGsiQueryAllOptions
    ) {
      return queryGsiByPkAndSk(pkSource, queryRange, true, options)
    },
    async queryOnePageWithGsiByPkAndSk<TGSIPKSource>(
      pkSource: TGSIPKSource,
      queryRange: SkQueryRange,
      options: AdvancedGsiQueryOnePageOptions = {}
    ) {
      return queryGsiByPkAndSk(pkSource, queryRange, false, options)
    },
    async scanAll(options: AdvancedScanAllOptions = {}) {
      return scanItems(entityContext, options, true)
    },
    async scanOnePage(options: AdvancedScanOnePageOptions = {}) {
      return scanItems(entityContext, options, false)
    },
    async scanAllWithGsi(options: AdvancedGsiScanAllOptions = {}) {
      return scanItems(entityContext, options, true, findGsiDetails(entityContext, options))
    },
    async scanOnePageWithGsi(options: AdvancedGsiScanOnePageOptions = {}) {
      return scanItems(entityContext, options, false, findGsiDetails(entityContext, options))
    },
    async batchPut(items: TItem[], options?: BatchPutOptions) {
      return batchPutItems(entityContext, items, options)
    },
    async batchDelete<TKeySource extends TPKSource & TSKSource>(
      keySources: TKeySource[],
      options?: BatchDeleteOptions
    ) {
      return deleteItems(entityContext, keySources, options)
    },
    async batchGet<TKeySource extends TPKSource & TSKSource>(
      keySources: TKeySource[],
      options?: BatchGetOptions
    ) {
      return getItems(entityContext, keySources, options)
    }
  }
}
