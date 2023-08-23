import { documentClientBackedInterface } from '../dynamoDBInterface'
import { realClock } from '../util/dateAndTime'
import {
  StoreConfiguration,
  Table,
  TableBackedStoreConfiguration,
  TableConfiguration
} from '../tableBackedStoreConfiguration'
import { EntityStoreLogger, noopLogger } from '../util/logger'
import { MetaAttributeNames } from '../entities'

export const MinimumMetaAttributeNamesWithStandardPK: MetaAttributeNames = {
  pk: 'PK'
}

export const PKOnlyStandardMetaAttributeNames = {
  ...MinimumMetaAttributeNamesWithStandardPK,
  ttl: 'ttl',
  entityType: '_et',
  lastUpdated: '_lastUpdated'
}

export const NoGSIStandardMetaAttributeNames = {
  ...PKOnlyStandardMetaAttributeNames,
  sk: 'SK'
}

export const SingleGSIStandardMetaAttributeNames = {
  ...NoGSIStandardMetaAttributeNames,
  gsisById: {
    gsi: {
      pk: 'GSIPK',
      sk: 'GSISK'
    }
  }
}

export const TwoGSIStandardMetaAttributeNames = {
  ...NoGSIStandardMetaAttributeNames,
  gsisById: {
    gsi: {
      pk: 'GSIPK',
      sk: 'GSISK'
    },
    gsi2: {
      pk: 'GSI2PK',
      sk: 'GSI2SK'
    }
  }
}

export function createMinimumTableConfiguration(pkAttributeName: string): TableConfiguration {
  return {
    metaAttributeNames: {
      ...MinimumMetaAttributeNamesWithStandardPK,
      pk: pkAttributeName
    }
  }
}

export function createMinimumTable(tableName: string, pkAttributeName: string): Table {
  return {
    tableName,
    ...createMinimumTableConfiguration(pkAttributeName)
  }
}

export const standardTableConfiguration: TableConfiguration = {
  metaAttributeNames: SingleGSIStandardMetaAttributeNames,
  gsiNames: { gsi: 'GSI' },
  allowScans: false
}

export function createStandardTable(tableName: string): Table {
  return {
    tableName,
    ...standardTableConfiguration
  }
}

/**
 * Configuration using single table for all entities, and PK / SK as partition key / sort key attribute names
 * Also enables ttl attribute ('ttl'), entity type attribute ('_et'), and last updated attribute ('_lastUpdated')
 * If not specified in overrides, a DynamoDB client is instantiated using the default configuration
 * Debug logging is disabled
 * @param tableName - the underlying DynamoDB actual table name
 * @param storeOverrides
 * @param tableOverrides
 */
export function createStandardSingleTableStoreConfig(
  tableName: string,
  storeOverrides: Partial<StoreConfiguration> = {},
  tableOverrides: Partial<TableConfiguration> = {}
): TableBackedStoreConfiguration {
  const dynamoDBSpecified = storeOverrides.globalDynamoDB || tableOverrides.dynamoDB

  return {
    store: storeConfig(storeOverrides, !dynamoDBSpecified),
    tables: {
      table: {
        ...createStandardTable(tableName),
        ...tableOverrides
      }
    }
  }
}

/**
 * Same configuration as standardSingleTableConfiguration but for multiple entities
 */
export function standardMultiTableConfiguration(
  tablesToEntityTypes: Record<string, string[]>,
  storeOverrides: Partial<StoreConfiguration> = {},
  tableOverrides: Partial<TableConfiguration> = {},
  defaultTableName?: string
): TableBackedStoreConfiguration {
  const dynamoDBSpecified = storeOverrides.globalDynamoDB || tableOverrides.dynamoDB

  const tableConfig: TableConfiguration = { ...standardTableConfiguration, ...tableOverrides }

  return {
    store: storeConfig(storeOverrides, !dynamoDBSpecified),
    tables: {
      entityTables: Object.entries(tablesToEntityTypes).map(([tableName, entityTypes]) => {
        return {
          tableName,
          entityTypes,
          ...tableConfig
        }
      }),
      ...(defaultTableName ? { defaultTableName } : {})
    }
  }
}

export function createSingleTableConfiguration(
  table: Table,
  storeConfiguration: Partial<StoreConfiguration> = {}
): TableBackedStoreConfiguration {
  return {
    store: storeConfig(storeConfiguration, !(table.dynamoDB || storeConfiguration.globalDynamoDB)),
    tables: {
      table
    }
  }
}

function storeConfig(
  partialStoreConfig: Partial<StoreConfiguration>,
  defineDynamoDb: boolean
): StoreConfiguration {
  const logger: EntityStoreLogger = partialStoreConfig.logger ?? noopLogger
  return {
    logger,
    clock: partialStoreConfig.clock ?? realClock(),
    ...(partialStoreConfig.globalDynamoDB
      ? { globalDynamoDB: partialStoreConfig.globalDynamoDB }
      : defineDynamoDb
      ? { globalDynamoDB: documentClientBackedInterface({ logger }) }
      : {})
  }
}
