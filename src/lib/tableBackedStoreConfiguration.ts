import { Clock, EntityStoreLogger } from './util'
import { DynamoDBInterface } from './dynamoDBInterface'
import { MetaAttributeNames } from './entities'

// See functions in _setupSupport.ts_ for assistance in creating these objects

export interface StoreContext {
  logger: EntityStoreLogger
  dynamoDB: DynamoDBInterface
  clock: Clock
}

export type TablesConfig = TableConfig | MultiTableConfig

export interface TableConfig {
  tableName: string
  metaAttributeNames: MetaAttributeNames
  allowScans?: boolean
  gsiNames?: Record<string, string>
}

export interface MultiTableConfig {
  entityTables: MultiEntityTableConfig[]
  defaultTableName?: string
}

export interface MultiEntityTableConfig extends TableConfig {
  entityTypes?: string[]
}

export function isSingleTableConfig(x: TablesConfig): x is TableConfig {
  return (x as TableConfig).tableName !== undefined
}
