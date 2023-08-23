import { NativeAttributeValue } from '@aws-sdk/util-dynamodb/dist-types/models'

export type DynamoDBValues = Record<string, NativeAttributeValue>

/**
 * The attribute names on the underlying table for various "meta" attributes
 * Note that only pk is required
 * These values can change for multi-table stores. E.g. one table may be a multi-entity "standard" configuration, and another
 * might be more customized for one specific entity
 * This type is included in this file since MetaAttributeNames are parsed to an Entity's parser function
 * "Standard" configuration for a multi-entity / single-table configuration, is defined in configSupport.ts, but in brief is:
 * pk: 'PK'
 * sk: 'SK'
 * gsisById: { gsi: { pk: 'GSIPK', sk: 'GSISK' } }
 * ttl: 'ttl',
 * entityType: '_et',
 * lastUpdated: '_lastUpdated'
 */
export interface MetaAttributeNames {
  pk: string
  sk?: string
  /**
   * Map of GSI **ID** (which might be different from the underlying index name) to corresponding GSI PK / GSI SK attribute names
   * If no GSIs are defined for the table this map should be undefined or empty
   */
  gsisById?: Record<string, { pk: string; sk?: string }>
  ttl?: string
  entityType?: string
  lastUpdated?: string
}

/**
 * Given an internal object, convert to the form stored in DynamoDB
 * By default the formatter is a "no-op" function - i.e. the object is stored to DynamoDB with no changes
 * Entities may want to customize this behavior, however, e.g. for changing formats (e.g. date times), or for stopping
 * certain properties being persisted
 */
export type EntityFormatter<T> = (item: T) => DynamoDBValues

/**
 * Given an item retrieved from DynamoDB, convert to internal form
 * If the EntityFormatter on an Entity is left as default then this is usually just an instantiation of 'typePredicateParser'
 * which doesn't actually do any object manipulation but does assert the correct type
 */
export type EntityParser<T> = (
  item: DynamoDBValues,
  allMetaAttributeNames: string[],
  metaAttributeNames: MetaAttributeNames
) => T

/**
 * Every object stored via Entity Store must have a corresponding Entity
 * Each entity must be related to type (TItem) that must at least define the table key fields, and optionally
 * all the other fields of the internal representation of an object
 */
export interface Entity<TItem extends TPKSource & TSKSource, TPKSource, TSKSource> {
  /**
   * Must be unique for each Entity used in the store, but can be any string. For tables that store multiple entities
   * the type is stored as a meta attribute on the table
   */
  type: string

  /**
   * @see EntityFormatter
   */
  convertToDynamoFormat?: EntityFormatter<TItem>

  /**
   * @see EntityParser
   */
  parse: EntityParser<TItem>

  /**
   * Given a subset of the fields of the entity type, generate the partition key value for the stored version of the object
   * Note that this may be as simple as returning a specific property on the object, but for "single table designs" will
   * often be some kind of encoding of one more fields
   * @param source
   */
  pk(source: TPKSource): string

  /**
   * Given a subset of the fields of the entity type, generate the sort key value for the stored version of the object.
   * This field is required for Entity, since most usages of DynamoDB include a sort key. However if your
   * entity is stored in a table without a sort key then see PKOnlyEntity for a version of Entity that only requires a
   * partition key
   * Note that this may be as simple as returning a specific property on the object, but for "single table designs" will
   * often be some kind of encoding of one more fields
   * @param source
   */
  sk(source: TSKSource): string

  /**
   * A map of GSI ID to generator functions, similar to pk() and sk()
   * Note that the GSI IDs do *not* have to be the same as the underlying index names, rather they must
   * be the same IDs as those defined in the table configuration (e.g. 'gsi', 'gsi2', if using "standard" configuration.)
   */
  gsis?: Record<string, GsiGenerators>
}

/**
 * An entity which stores objects on a table that only has a partition key, and does not have a sort key
 */
export type PKOnlyEntity<TItem extends TPKSource, TPKSource> = Omit<Entity<TItem, TPKSource, unknown>, 'sk'>

export interface GsiGenerators {
  // ToMaybe - better types for these?
  pk(source: unknown): string

  sk?(source: unknown): string
}
