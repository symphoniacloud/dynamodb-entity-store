import { TableResolver } from '../tableBackedConfigurationResolver'
import { Entity } from '../../entities'
import { MultipleEntityOperations, QueryMultipleBy } from '../../multipleEntityOperations'
import { createEntityContext, EntityContext } from '../entityContext'
import { GsiQueryOptions, QueryAndScanOptions, QueryOptions } from '../../operationOptions'
import { multipleEntityScan } from './multipleEntityScanOperation'
import { queryMultipleByTable, queryMultipleByGsi } from './queryMultipleBy'

export function tableBackedMultipleEntityOperations(
  tableConfigResolver: TableResolver,
  entities: Entity<unknown, unknown, unknown>[]
): MultipleEntityOperations {
  const contextsByEntityType: Record<string, EntityContext<unknown, unknown, unknown>> = Object.fromEntries(
    entities.map((e) => [e.type, createEntityContext(tableConfigResolver(e.type), e)])
  )
  if (new Set(Object.values(contextsByEntityType).map((c) => c.tableName)).size > 1)
    throw new Error(
      'Several tables would be required for this operation - please select only entities stored in one table'
    )

  return {
    query<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
      keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
      options?: QueryOptions
    ): QueryMultipleBy<TPKSource> {
      return queryMultipleByTable(contextsByEntityType, keyEntity, options ?? {})
    },
    queryWithGsi<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource, TGSIPKSource>(
      keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
      options?: GsiQueryOptions
    ): QueryMultipleBy<TGSIPKSource> {
      return queryMultipleByGsi(contextsByEntityType, keyEntity, options ?? {})
    },
    async scan(options?: QueryAndScanOptions) {
      return await multipleEntityScan(contextsByEntityType, options ?? {})
    }
  }
}
