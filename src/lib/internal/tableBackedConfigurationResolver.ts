import {
  isSingleTableConfig,
  MultiEntityTableConfig,
  StoreContext,
  TableConfig,
  TablesConfig
} from '../tableBackedStoreConfiguration'
import { EntityContextParams } from './entityContext'
import { throwError } from '../util/errors'

export type EntityContextResolver = (entityType: string) => EntityContextParams

export function resolverFor(storeContext: StoreContext, config: TablesConfig): EntityContextResolver {
  return isSingleTableConfig(config)
    ? singleTableResolver(storeContext, config)
    : multiTableResolver(storeContext, config.entityTables, config.defaultTableName)
}

function singleTableResolver(storeContext: StoreContext, table: TableConfig) {
  const entityContext = { storeContext, table }
  return () => entityContext
}

function multiTableResolver(
  storeContext: StoreContext,
  entityTables: MultiEntityTableConfig[],
  defaultTableName: string | undefined
) {
  const tablesByEt: Record<string, TableConfig> = Object.fromEntries(
    entityTables.map((table) => (table.entityTypes ?? []).map((entityType) => [entityType, table])).flat()
  )

  const defaultTable = defaultTableName
    ? entityTables.find((t) => t.tableName === defaultTableName) ??
      throwError(`Unable to find table configuration for default table name ${defaultTableName}`)()
    : undefined

  return (entityType: string) => {
    return {
      storeContext,
      table:
        tablesByEt[entityType] ??
        defaultTable ??
        throwError(`Unable to locate table that supports entity type ${entityType}`)()
    }
  }
}
