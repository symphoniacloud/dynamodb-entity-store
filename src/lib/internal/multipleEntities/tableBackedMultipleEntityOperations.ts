import { EntityContextResolver } from '../tableBackedConfigurationResolver'
import { Entity } from '../../entities'
import { MultipleEntityOperations, QueryMultipleBy } from '../../multipleEntityOperations'
import { createEntityContext, EntityContext } from '../entityContext'
import { multipleEntityScan } from './multipleEntityScanOperation'
import { queryMultipleByGsi, queryMultipleByTable } from './queryMultipleBy'
import {
  AdvancedGsiQueryOnePageOptions,
  AdvancedQueryOnePageOptions,
  AdvancedScanOnePageOptions
} from '../../singleEntityAdvancedOperations'

export function tableBackedMultipleEntityOperations(
  entityContextResolver: EntityContextResolver,
  entities: Entity<unknown, unknown, unknown>[]
): MultipleEntityOperations {
  const contextsByEntityType: Record<string, EntityContext<unknown, unknown, unknown>> = Object.fromEntries(
    entities.map((e) => [e.type, createEntityContext(entityContextResolver(e.type), e)])
  )
  if (new Set(Object.values(contextsByEntityType).map((c) => c.tableName)).size > 1)
    throw new Error(
      'Several tables would be required for this operation - please select only entities stored in one table'
    )

  // TODO - need all pages options
  return {
    query<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
      keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
      options?: AdvancedQueryOnePageOptions
    ): QueryMultipleBy<TPKSource> {
      return queryMultipleByTable(contextsByEntityType, keyEntity, options ?? {})
    },
    queryWithGsi<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource, TGSIPKSource>(
      keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
      options?: AdvancedGsiQueryOnePageOptions
    ): QueryMultipleBy<TGSIPKSource> {
      return queryMultipleByGsi(contextsByEntityType, keyEntity, options ?? {})
    },
    async scan(options?: AdvancedScanOnePageOptions) {
      return await multipleEntityScan(contextsByEntityType, options ?? {})
    }
  }
}
