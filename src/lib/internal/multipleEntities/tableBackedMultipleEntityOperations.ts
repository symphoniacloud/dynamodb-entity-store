import { EntityContextResolver } from '../tableBackedConfigurationResolver'
import { Entity } from '../../entities'
import { MultipleEntityCollectionResponse, MultipleEntityOperations } from '../../multipleEntityOperations'
import { createEntityContext } from '../entityContext'
import { scanMultiple } from './multipleEntityScanOperation'
import {
  AdvancedGsiQueryAllOptions,
  AdvancedGsiQueryOnePageOptions,
  AdvancedQueryAllOptions,
  AdvancedQueryOnePageOptions,
  AdvancedScanAllOptions,
  AdvancedScanOnePageOptions
} from '../../singleEntityAdvancedOperations'
import {
  queryMultipleByGsiPk,
  queryMultipleByGsiSkRange,
  queryMultipleByPk,
  queryMultipleBySkRange
} from './multipleEntityQueryOperations'
import { SkQueryRange } from '../../singleEntityOperations'
import { EntityContextsByEntityType } from './multipleEntitiesQueryAndScanCommon'

export function tableBackedMultipleEntityOperations(
  entityContextResolver: EntityContextResolver,
  entities: Entity<unknown, unknown, unknown>[]
): MultipleEntityOperations {
  const contextsByEntityType: EntityContextsByEntityType = Object.fromEntries(
    entities.map((e) => [e.type, createEntityContext(entityContextResolver(e.type), e)])
  )
  if (new Set(Object.values(contextsByEntityType).map((c) => c.tableName)).size > 1)
    throw new Error(
      'Several tables would be required for this operation - please select only entities stored in one table'
    )

  return {
    async queryAllByPk<TKeyItem extends TPKSource, TPKSource>(
      keyEntity: Entity<TKeyItem, TPKSource, unknown>,
      pkSource: TPKSource,
      options?: AdvancedQueryAllOptions
    ) {
      return queryMultipleByPk(contextsByEntityType, keyEntity, pkSource, true, options)
    },
    async queryOnePageByPk<TKeyItem extends TPKSource, TPKSource>(
      keyEntity: Entity<TKeyItem, TPKSource, unknown>,
      pkSource: TPKSource,
      options?: AdvancedQueryOnePageOptions
    ) {
      return queryMultipleByPk(contextsByEntityType, keyEntity, pkSource, false, options)
    },
    async queryAllByPkAndSk<TKeyItem extends TPKSource, TPKSource>(
      keyEntity: Entity<TKeyItem, TPKSource, unknown>,
      pkSource: TPKSource,
      queryRange: SkQueryRange,
      options?: AdvancedQueryAllOptions
    ) {
      return queryMultipleBySkRange(contextsByEntityType, keyEntity, pkSource, queryRange, true, options)
    },
    async queryOnePageByPkAndSk<TKeyItem extends TPKSource, TPKSource>(
      keyEntity: Entity<TKeyItem, TPKSource, unknown>,
      pkSource: TPKSource,
      queryRange: SkQueryRange,
      options?: AdvancedQueryOnePageOptions
    ) {
      return queryMultipleBySkRange(contextsByEntityType, keyEntity, pkSource, queryRange, false, options)
    },
    async queryAllWithGsiByPk<TKeyItem, TGSIPKSource>(
      keyEntity: Entity<TKeyItem, unknown, unknown>,
      pkSource: TGSIPKSource,
      options?: AdvancedGsiQueryAllOptions
    ) {
      return queryMultipleByGsiPk(contextsByEntityType, keyEntity, pkSource, true, options)
    },
    async queryOnePageWithGsiByPk<TKeyItem, TGSIPKSource>(
      keyEntity: Entity<TKeyItem, unknown, unknown>,
      pkSource: TGSIPKSource,
      options?: AdvancedQueryOnePageOptions
    ) {
      return queryMultipleByGsiPk(contextsByEntityType, keyEntity, pkSource, false, options)
    },
    async queryAllWithGsiByPkAndSk<TKeyItem, TGSIPKSource>(
      keyEntity: Entity<TKeyItem, unknown, unknown>,
      pkSource: TGSIPKSource,
      queryRange: SkQueryRange,
      options?: AdvancedGsiQueryAllOptions
    ): Promise<MultipleEntityCollectionResponse> {
      return queryMultipleByGsiSkRange(contextsByEntityType, keyEntity, pkSource, queryRange, true, options)
    },
    async queryOnePageWithGsiByPkAndSk<TKeyItem, TGSIPKSource>(
      keyEntity: Entity<TKeyItem, unknown, unknown>,
      pkSource: TGSIPKSource,
      queryRange: SkQueryRange,
      options?: AdvancedGsiQueryOnePageOptions
    ): Promise<MultipleEntityCollectionResponse> {
      return queryMultipleByGsiSkRange(contextsByEntityType, keyEntity, pkSource, queryRange, false, options)
    },
    async scanAll(options?: AdvancedScanAllOptions): Promise<MultipleEntityCollectionResponse> {
      return await scanMultiple(contextsByEntityType, true, options)
    },
    async scanOnePage(options?: AdvancedScanOnePageOptions) {
      return await scanMultiple(contextsByEntityType, false, options)
    }
  }
}
