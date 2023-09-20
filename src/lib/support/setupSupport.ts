import { documentClientBackedInterface } from '../dynamoDBInterface'
import { realClock } from '../util/dateAndTime'
import { MultiTableConfig, StoreContext, TableConfig } from '../tableBackedStoreConfiguration'
import { noopLogger } from '../util/logger'
import { MetaAttributeNames } from '../entities'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

/**
 * Create store context, optionally passing overrides to defaults.
 * By default the following are used:
 * * `logger` : No-op logger (Don't log)
 * * `dynamoDB` : Wrapper using default DynamoDB document client. Typically you'd only override this in unit / in-process tests. To use non default DynamoDB Document Client behavior then specify the documentClient parameter instead.
 * * `clock` : Real clock based on system time (it can be useful to override this in tests)
 * @param options - override any of the default context values. Can be explicitly set to `{}` to use default values.
 * @param documentClient - override the DynamoDB document client used in the default DynamoDB wrapper. **IGNORED** if `dynamoDB` is provided in `options`
 */
export function createStoreContext(
  options: Partial<StoreContext> = {},
  documentClient?: DynamoDBDocumentClient
): StoreContext {
  const logger = options.logger ?? noopLogger
  return {
    clock: options.clock ?? realClock(),
    logger,
    dynamoDB: options.dynamoDB ?? documentClientBackedInterface(logger, documentClient)
  }
}

/**
 * Create the minimum table config when using a single table. Useful as a base if you're using "non-standard" config
 * @param tableName - the underlying DynamoDB table name
 * @param metaAttributeNames - Attribute names for meta values. At least Partition Key must be specified
 */
export function createMinimumSingleTableConfig(
  tableName: string,
  metaAttributeNames: MetaAttributeNames
): TableConfig {
  return {
    tableName,
    metaAttributeNames
  }
}

/**
 * Create "standard single table" config.
 * * Partition Key attribute name = `PK`
 * * Sort Key attribute name = `SK`
 * * TTL attribute name = `ttl`
 * * Entity Type attribute name = `_et`
 * * Last Updated attribute name = `_lastUpdated`
 * * One GSI, with Table GSI name = `GSI`, logical GSI name = `gsi`, GSI Partition Key = `GSIPK`, GSI Sort Key = `GSISK`
 * * Scans not allowed
 * @param tableName - the underlying DynamoDB table name
 */
export function createStandardSingleTableConfig(tableName: string): TableConfig {
  return {
    ...createMinimumSingleTableConfig(tableName, SingleGSIStandardMetaAttributeNames),
    gsiNames: { gsi: 'GSI' },
    allowScans: false
  }
}

/**
 * Same configuration as createStandardSingleTableConfig but for multiple entities
 * @param tablesToEntityTypes Map of underlying Dynamo Table Names to the entities stored in each table
 * @param defaultTableName Which table to use if an operation is performed on an entity not explicitly configured in tablesToEntityTypes. Default - no default table is used, and all entities must be explicitly configured.
 * @throws if `defaultTableName` isn't included in keys of `tablesToEntityTypes`
 */
export function createStandardMultiTableConfig(
  tablesToEntityTypes: Record<string, string[]>,
  defaultTableName?: string
): MultiTableConfig {
  if (defaultTableName && !Object.keys(tablesToEntityTypes).includes(defaultTableName))
    throw new Error(`Default table ${defaultTableName} is not included in list of tables`)

  return {
    ...(defaultTableName ? { defaultTableName } : {}),
    entityTables: Object.entries(tablesToEntityTypes).map(([tableName, entityTypes]) => {
      return {
        ...createStandardSingleTableConfig(tableName),
        entityTypes
      }
    })
  }
}

export const NoGSIStandardMetaAttributeNames = {
  pk: 'PK',
  sk: 'SK',
  ttl: 'ttl',
  entityType: '_et',
  lastUpdated: '_lastUpdated'
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
