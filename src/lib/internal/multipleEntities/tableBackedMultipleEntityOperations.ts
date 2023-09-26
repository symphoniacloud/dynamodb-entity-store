import { EntityContextResolver } from '../tableBackedConfigurationResolver'
import { Entity } from '../../entities'
import { MultipleEntityCollectionResponse, MultipleEntityOperations } from '../../multipleEntityOperations'
import { createEntityContext } from '../entityContext'
import { scanMultiple } from './multipleEntityScanOperation'
import {
  AdvancedGsiQueryOnePageOptions,
  AdvancedQueryOnePageOptions,
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
    async queryOnePageByPk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
      keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
      pkSource: TPKSource,
      options: AdvancedQueryOnePageOptions = {}
    ): Promise<MultipleEntityCollectionResponse> {
      return await queryMultipleByPk(contextsByEntityType, keyEntity, pkSource, options)
    },
    async queryOnePageByPkAndSk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
      keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
      pkSource: TPKSource,
      queryRange: SkQueryRange,
      options: AdvancedQueryOnePageOptions = {}
    ): Promise<MultipleEntityCollectionResponse> {
      return await queryMultipleBySkRange(contextsByEntityType, keyEntity, pkSource, queryRange, options)
    },
    async queryOnePageWithGsiByPk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource, TGSIPKSource>(
      keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
      pkSource: TGSIPKSource,
      options: AdvancedGsiQueryOnePageOptions = {}
    ): Promise<MultipleEntityCollectionResponse> {
      return await queryMultipleByGsiPk(contextsByEntityType, keyEntity, pkSource, options)
    },
    async queryOnePageWithGsiByPkAndSk<
      TKeyItem extends TPKSource & TSKSource,
      TPKSource,
      TSKSource,
      TGSIPKSource
    >(
      keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
      pkSource: TGSIPKSource,
      queryRange: SkQueryRange,
      options: AdvancedGsiQueryOnePageOptions = {}
    ): Promise<MultipleEntityCollectionResponse> {
      return await queryMultipleByGsiSkRange(contextsByEntityType, keyEntity, pkSource, queryRange, options)
    },
    async scanOnePage(options: AdvancedScanOnePageOptions = {}) {
      return await scanMultiple(contextsByEntityType, options)
    }
  }
}
