import { CompleteTableParams, createEntityContext, EntityContext } from '../entityContext'
import { Entity } from '../../entities'
import { putItem } from './putItem'
import { getItem } from './getItem'
import { deleteItem } from './deleteItem'
import { scanItems } from './scanItemsPage'
import { updateItem } from './updateItem'
import {
  DeleteOptions,
  GetOptions,
  GsiQueryAllOptions,
  GsiQueryOnePageOptions,
  OnePageResponse,
  PutOptions,
  QueryAllOptions,
  QueryOnePageOptions,
  ScanOnePageOptions,
  SingleEntityOperations,
  SkQueryRange,
  UpdateOptions
} from '../../singleEntityOperations'
import { tableBackedSingleEntityAdvancedOperations } from './advanced/tableBackedSingleEntityAdvancedOperations'
import { queryAllItems, QueryCriteria, queryItemsPage } from './queryItems'
import { expressionAttributeParams } from '../operationsCommon'
import { findGsiDetails, GsiDetails } from '../common/gsiQueryCommon'

export function tableBackedSingleEntityOperations<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  table: CompleteTableParams,
  entity: Entity<TItem, TPKSource, TSKSource>
): SingleEntityOperations<TItem, TPKSource, TSKSource> {
  // TODO - consider caching this for performance
  const entityContext: EntityContext<TItem, TPKSource, TSKSource> = createEntityContext(table, entity)

  return {
    async put(item: TItem, options?: PutOptions): Promise<TItem> {
      return await putItem(entityContext, item, options)
    },

    async update<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options: UpdateOptions
    ): Promise<void> {
      await updateItem(entityContext, keySource, options)
    },

    async getOrUndefined<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: GetOptions
    ): Promise<TItem | undefined> {
      return await getItem(entityContext, keySource, options)
    },

    async getOrThrow<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: GetOptions
    ): Promise<TItem> {
      const item = await getItem(entityContext, keySource, options)
      if (item) return item
      throw new Error(
        `Unable to find item for entity [${entity.type}] with key source ${JSON.stringify(keySource)}`
      )
    },

    async delete<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: DeleteOptions
    ): Promise<void> {
      await deleteItem(entityContext, keySource, options)
    },

    async queryAllByPk(pkSource: TPKSource, options: QueryAllOptions = {}): Promise<TItem[]> {
      return await queryAllItems(entityContext, pkQueryCriteria(entityContext, pkSource), options)
    },

    async queryOnePageByPk(
      pkSource: TPKSource,
      options: QueryOnePageOptions = {}
    ): Promise<OnePageResponse<TItem>> {
      return await queryItemsPage(entityContext, pkQueryCriteria(entityContext, pkSource), options)
    },

    async queryAllByPkAndSk(
      pkSource: TPKSource,
      queryRange: SkQueryRange,
      options: QueryAllOptions = {}
    ): Promise<TItem[]> {
      return await queryAllItems(
        entityContext,
        skRangeQueryCriteria(entityContext, pkSource, queryRange),
        options
      )
    },

    async queryOnePageByPkAndSk(
      pkSource: TPKSource,
      queryRange: SkQueryRange,
      options: QueryOnePageOptions = {}
    ): Promise<OnePageResponse<TItem>> {
      return await queryItemsPage(
        entityContext,
        skRangeQueryCriteria(entityContext, pkSource, queryRange),
        options
      )
    },

    async queryAllWithGsiByPk<TGSIPKSource>(
      pkSource: TGSIPKSource,
      options: GsiQueryAllOptions = {}
    ): Promise<TItem[]> {
      const gsiDetails = findGsiDetails(entityContext, options)
      return await queryAllItems(entityContext, gsiPkQueryCriteria(gsiDetails, pkSource), options)
    },

    async queryOnePageWithGsiPageByPk<TGSIPKSource>(
      pkSource: TGSIPKSource,
      options: GsiQueryOnePageOptions = {}
    ): Promise<OnePageResponse<TItem>> {
      const gsiDetails = findGsiDetails(entityContext, options)
      return await queryItemsPage(entityContext, gsiPkQueryCriteria(gsiDetails, pkSource), options)
    },

    async queryAllWithGsiByPkAndSk<TGSIPKSource>(
      pkSource: TGSIPKSource,
      queryRange: SkQueryRange,
      options: GsiQueryAllOptions = {}
    ): Promise<TItem[]> {
      const gsiDetails = findGsiDetails(entityContext, options)
      return await queryAllItems(
        entityContext,
        gsiSkRangeQueryCriteria(gsiDetails, pkSource, queryRange),
        options
      )
    },

    async queryOnePageWithGsiPageByPkAndSk<TGSIPKSource>(
      pkSource: TGSIPKSource,
      queryRange: SkQueryRange,
      options: GsiQueryOnePageOptions = {}
    ): Promise<OnePageResponse<TItem>> {
      const gsiDetails = findGsiDetails(entityContext, options)
      return await queryItemsPage(
        entityContext,
        gsiSkRangeQueryCriteria(gsiDetails, pkSource, queryRange),
        options
      )
    },

    async scanAll() {
      if (!table.allowScans) throw new Error('Scan operations are disabled for this store')
      return (await scanItems(entityContext, {}, true)).items
    },

    async scanOnePage(options: ScanOnePageOptions = {}) {
      if (!table.allowScans) throw new Error('Scan operations are disabled for this store')
      return await scanItems(entityContext, options, false)
    },

    advancedOperations: tableBackedSingleEntityAdvancedOperations(table, entity)
  }
}

export function pkQueryCriteria<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  { metaAttributeNames, entity }: EntityContext<TItem, TPKSource, TSKSource>,
  source: TPKSource
): QueryCriteria {
  return {
    keyConditionExpression: `${metaAttributeNames.pk} = :pk`,
    partialCriteria: expressionAttributeParams({ ':pk': entity.pk(source) })
  }
}

export function skRangeQueryCriteria<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  { metaAttributeNames, entity }: EntityContext<TItem, TPKSource, TSKSource>,
  pkSource: TPKSource,
  queryRange: SkQueryRange
): QueryCriteria {
  if (!metaAttributeNames.sk) throw new Error('Unable to query by sk - table has no sort key')
  return {
    keyConditionExpression: `${metaAttributeNames.pk} = :pk and ${queryRange.skConditionExpressionClause}`,
    partialCriteria: expressionAttributeParams(
      {
        ':pk': entity.pk(pkSource),
        ...queryRange.expressionAttributeValues
      },
      {
        '#sk': metaAttributeNames.sk
      }
    )
  }
}

export function gsiPkQueryCriteria(gsiDetails: GsiDetails, pkSource: unknown): QueryCriteria {
  return {
    keyConditionExpression: `${gsiDetails.attributeNames.pk} = :pk`,
    partialCriteria: {
      IndexName: gsiDetails.tableIndexName,
      ...expressionAttributeParams({ ':pk': gsiDetails.generators.pk(pkSource) })
    }
  }
}

export function gsiSkRangeQueryCriteria(
  gsiDetails: GsiDetails,
  pkSource: unknown,
  queryRange: SkQueryRange
): QueryCriteria {
  if (!gsiDetails.attributeNames.sk)
    throw new Error('Unable to query by GSI sk - GSI on table has no sort key')
  return {
    keyConditionExpression: `${gsiDetails.attributeNames.pk} = :pk and ${queryRange.skConditionExpressionClause}`,
    partialCriteria: {
      IndexName: gsiDetails.tableIndexName,
      ...expressionAttributeParams(
        {
          ':pk': gsiDetails.generators.pk(pkSource),
          ...queryRange.expressionAttributeValues
        },
        {
          '#sk': gsiDetails.attributeNames.sk,
          ...queryRange.expressionAttributeNames
        }
      )
    }
  }
}
