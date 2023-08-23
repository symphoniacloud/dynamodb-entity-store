import {
  isSingleTableConfig,
  StoreConfiguration,
  Table,
  TableBackedStoreConfiguration
} from '../tableBackedStoreConfiguration'
import { CompleteTableParams } from './entityContext'
import { throwError } from '../util/errors'

export type TableResolver = (entityType: string) => CompleteTableParams

export function resolverFor(config: TableBackedStoreConfiguration): TableResolver {
  if (isSingleTableConfig(config.tables)) {
    return singleTableResolver(completeConfiguration(config.store, config.tables.table))
  }
  // Else MultiTable
  const { entityTables, defaultTableName } = config.tables

  const completeConfigsByEntityType: Record<string, CompleteTableParams> = Object.fromEntries(
    entityTables
      .map((table) => {
        const completeConfig = completeConfiguration(config.store, table)
        return (table.entityTypes ?? []).map((entityType) => [entityType, completeConfig])
      })
      .flat()
  )

  const completeDefaultTableConfig = defaultTableName
    ? completeConfiguration(
        config.store,
        config.tables.entityTables.find((t) => t.tableName === defaultTableName) ??
          throwError(`Unable to find table configuration for default table name ${defaultTableName}`)()
      )
    : undefined

  return multiTableResolver(completeConfigsByEntityType, completeDefaultTableConfig)
}

function singleTableResolver(config: CompleteTableParams): TableResolver {
  return () => config
}

function multiTableResolver(
  completeConfigsByEntityType: Record<string, CompleteTableParams>,
  completeDefaultTableConfig?: CompleteTableParams
): TableResolver {
  return (entityType: string) => {
    return (
      completeConfigsByEntityType[entityType] ??
      completeDefaultTableConfig ??
      throwError(`Unable to locate table that supports entity type ${entityType}`)()
    )
  }
}

function completeConfiguration(store: StoreConfiguration, table: Table): CompleteTableParams {
  return {
    clock: store.clock,
    logger: store.logger,
    allowScans: table.allowScans !== undefined && table.allowScans,
    dynamoDB:
      table.dynamoDB ??
      store.globalDynamoDB ??
      throwError(`DynamoDB wrapper is not available at either the table or global scope`)(),
    ...table
  }
}
