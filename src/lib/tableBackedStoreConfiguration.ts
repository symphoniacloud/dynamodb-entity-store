import { Clock } from './util'
import { DynamoDBInterface } from './dynamoDBInterface'
import { EntityStoreLogger } from './util'
import { MetaAttributeNames } from './entities'

export interface TableBackedStoreConfiguration {
  store: StoreConfiguration
  tables: SingleTableConfiguration | MultiTableConfiguration
}

export interface StoreConfiguration {
  clock: Clock // Defaults to clock based off system time. Overridable for testing
  globalDynamoDB?: DynamoDBInterface // TODO - test this - not used in standard config
  logger: EntityStoreLogger
}

export interface SingleTableConfiguration {
  table: Table
}

export interface MultiTableConfiguration {
  defaultTableName?: string
  entityTables: MultiEntityTable[]
}

export interface MultiEntityTable extends Table {
  entityTypes?: string[]
}
export interface Table extends TableConfiguration {
  tableName: string
}

export interface TableConfiguration {
  metaAttributeNames: MetaAttributeNames
  dynamoDB?: DynamoDBInterface // TODO - check using global by default
  allowScans?: boolean
  gsiNames?: Record<string, string>
}

export function isSingleTableConfig(
  x: SingleTableConfiguration | MultiTableConfiguration
): x is SingleTableConfiguration {
  return (x as SingleTableConfiguration).table !== undefined
}
