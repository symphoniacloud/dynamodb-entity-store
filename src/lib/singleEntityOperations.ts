import { DynamoDBValues } from './entities'
import { SingleEntityAdvancedOperations } from './singleEntityAdvancedOperations'

/**
 * All the operations available when working with one entity at a time.
 * This interface contains the "simple" versions of equivalent DynamoDB operations,
 * but if you need more advanced behavior - e.g. for reading DynamoDB metadata - then use
 * the versions on `advancedOperations`
 */
export interface SingleEntityOperations<TItem extends TPKSource & TSKSource, TPKSource, TSKSource> {
  advancedOperations: SingleEntityAdvancedOperations<TItem, TPKSource, TSKSource>

  put(item: TItem, options?: PutOptions): Promise<TItem>

  update<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options: UpdateOptions
  ): Promise<void>

  getOrUndefined<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options?: GetOptions
  ): Promise<TItem | undefined>

  getOrThrow<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options?: GetOptions
  ): Promise<TItem>

  delete<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options?: DeleteOptions
  ): Promise<void>

  queryAllByPk(pkSource: TPKSource, options?: QueryAllOptions): Promise<TItem[]>

  queryOnePageByPk(pkSource: TPKSource, options?: QueryOnePageOptions): Promise<OnePageResponse<TItem>>

  queryAllByPkAndSk(
    pkSource: TPKSource,
    queryRange: SkQueryRange,
    options?: QueryAllOptions
  ): Promise<TItem[]>

  queryOnePageByPkAndSk(
    pkSource: TPKSource,
    queryRange: SkQueryRange,
    options?: QueryOnePageOptions
  ): Promise<OnePageResponse<TItem>>

  queryAllWithGsiByPk<TGSIPKSource>(pkSource: TGSIPKSource, options?: GsiQueryAllOptions): Promise<TItem[]>

  queryOnePageWithGsiByPk<TGSIPKSource>(
    pkSource: TGSIPKSource,
    options?: GsiQueryOnePageOptions
  ): Promise<OnePageResponse<TItem>>

  queryAllWithGsiByPkAndSk<TGSIPKSource>(
    pkSource: TGSIPKSource,
    queryRange: SkQueryRange,
    options?: GsiQueryAllOptions
  ): Promise<TItem[]>

  queryOnePageWithGsiByPkAndSk<TGSIPKSource>(
    pkSource: TGSIPKSource,
    queryRange: SkQueryRange,
    options?: GsiQueryOnePageOptions
  ): Promise<OnePageResponse<TItem>>

  scanAll(options?: ScanAllOptions): Promise<TItem[]>

  scanOnePage(options?: ScanOnePageOptions): Promise<OnePageResponse<TItem>>

  scanAllWithGsi(options?: GsiScanAllOptions): Promise<TItem[]>

  scanOnePageWithGsi(options?: GsiScanOnePageOptions): Promise<OnePageResponse<TItem>>
}

export interface PutOptions {
  /**
   * DynamoDB Condition Expression
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html
   * @default No condition set
   */
  conditionExpression?: string

  /**
   * DynamoDB Expression Attribute Values for Condition Expression
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeValues.html
   * @default No values set
   */
  expressionAttributeValues?: DynamoDBValues

  /**
   * DynamoDB Expression Attribute Names for Condition Expression
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html
   * @default No names set
   */
  expressionAttributeNames?: Record<string, string>

  /**
   * Absolute TTL value on record, if TTL attribute configured for table
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/howitworks-ttl.html
   * @default No TTL set, unless `ttlInFutureDays` is set
   */
  ttl?: number

  /**
   * Sets TTL value on record with a relative value - now + number of days in the future
   * **If the `ttl` attribute is set then this value is ignored**
   * DynamoDB only guarantees TTL cleanup precision within a few days, so more precision here is unnecessary
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/howitworks-ttl.html
   * @default No TTL set, unless `ttl` is set
   */
  ttlInFutureDays?: number
}

export interface UpdateOptions {
  /**
   * Update Expression, with each of the 4 possible clauses broken out
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
   * @default No update expression set. This is only valid if the update is only used for updating the TTL value
   */
  update?: {
    set?: string
    remove?: string
    add?: string
    delete?: string
  }

  /**
   * DynamoDB Condition Expression
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html
   * @default No condition set
   */
  conditionExpression?: string

  /**
   * DynamoDB Expression Attribute Values for Update and/or Condition Expression
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeValues.html
   * @default No values set
   */
  expressionAttributeValues?: DynamoDBValues

  /**
   * DynamoDB Expression Attribute Names for Update and/or Condition Expression
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html
   * @default No names set
   */
  expressionAttributeNames?: Record<string, string>

  /**
   * Absolute TTL value on record, if TTL attribute configured for table
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/howitworks-ttl.html
   * @default No TTL set, unless `ttlInFutureDays` is set
   */
  ttl?: number

  /**
   * Sets TTL value on record with a relative value - now + number of days in the future
   * **If the `ttl` attribute is set then this value is ignored**
   * DynamoDB only guarantees TTL cleanup precision within a few days, so more precision here is unnecessary
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/howitworks-ttl.html
   * @default No TTL set, unless `ttl` is set
   */
  ttlInFutureDays?: number
}

export interface GetOptions {
  /**
   * Whether to use the "consistent read model"
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html
   * @default DynamoDB's default which is `false`, i.e. use Eventually Consistent Reads
   */
  consistentRead?: boolean
}

export interface DeleteOptions {
  /**
   * DynamoDB Condition Expression
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html
   * @default No condition set
   */
  conditionExpression?: string

  /**
   * DynamoDB Expression Attribute Values for Condition Expression
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeValues.html
   * @default No values set
   */
  expressionAttributeValues?: DynamoDBValues

  /**
   * DynamoDB Expression Attribute Names for Condition Expression
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html
   * @default No names set
   */
  expressionAttributeNames?: Record<string, string>
}

export interface QueryAllOptions {
  /**
   * Whether to return results in ascending order
   * @see _ScanIndexForward_ at https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
   * @default DynamoDB's default which is `true`
   */
  scanIndexForward?: boolean

  /**
   * Determines the read consistency model: If set to true, then the operation uses strongly consistent reads; otherwise, the operation uses eventually consistent reads.
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html#DDB-Query-request-ConsistentRead
   * @default DynamoDB's default which is `false`
   */
  consistentRead?: boolean
}

export interface QueryOnePageOptions {
  /**
   * Max number of items to read
   * @see _Limit_ at https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
   * @default DynamoDB's default which is no limit set, but a maximum of 1MB of data
   */
  limit?: number

  /**
   * The key of the first item to read
   * @see `ExclusiveStartKey` at https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
   * @default DynamoDB's default, which is start at first item
   */
  exclusiveStartKey?: DynamoDBValues

  /**
   * Whether to return results in ascending order
   * @see _ScanIndexForward_ at https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
   * @default DynamoDB's default which is `true`, i.e.
   */
  scanIndexForward?: boolean

  /**
   * Determines the read consistency model: If set to true, then the operation uses strongly consistent reads; otherwise, the operation uses eventually consistent reads.
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html#DDB-Query-request-ConsistentRead
   * @default DynamoDB's default which is `false`
   */
  consistentRead?: boolean
}

export interface WithGsiId {
  /**
   * If an entity has multiple GSIs then this property must be used to specify which GSI to use
   * @default use the only GSI on the entity
   */
  gsiId?: string
}

export type GsiQueryAllOptions = Omit<QueryAllOptions, 'consistentRead'> & WithGsiId

export type GsiQueryOnePageOptions = Omit<QueryOnePageOptions, 'consistentRead'> & WithGsiId

export interface SkQueryRange {
  /**
   * The sort-key part of the query expression (the PK part will be generated on your behalf)
   * @see support/querySupport.ts
   * @see _KeyConditionExpression_ at https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
   */
  skConditionExpressionClause: string
  /**
   * DynamoDB Expression Attribute Values for _skConditionExpressionClause_
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeValues.html
   * @default No values set
   */
  expressionAttributeValues?: DynamoDBValues
  /**
   * DynamoDB Expression Attribute Names for _skConditionExpressionClause_
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html
   * @default No names set
   */
  expressionAttributeNames?: Record<string, string>
}

export interface ScanAllOptions {
  /**
   * Determines the read consistency model: If set to true, then the operation uses strongly consistent reads; otherwise, the operation uses eventually consistent reads.
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html#DDB-Scan-request-ConsistentRead
   * @default DynamoDB's default which is `false`
   */
  consistentRead?: boolean
}

export interface ScanOnePageOptions {
  /**
   * Max number of items to read
   * @see _Limit_ at https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html
   * @default DynamoDB's default which is no limit set, but a maximum of 1MB of data
   */
  limit?: number

  /**
   * The key of the first item to read
   * @see `ExclusiveStartKey` at https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html
   * @default DynamoDB's default, which is start at first item
   */
  exclusiveStartKey?: DynamoDBValues

  /**
   * Determines the read consistency model: If set to true, then the operation uses strongly consistent reads; otherwise, the operation uses eventually consistent reads.
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html#DDB-Scan-request-ConsistentRead
   * @default DynamoDB's default which is `false`
   */
  consistentRead?: boolean
}

export type GsiScanAllOptions = WithGsiId

export type GsiScanOnePageOptions = Omit<ScanOnePageOptions, 'consistentRead'> & WithGsiId

export interface OnePageResponse<TItem> {
  /**
   * Result of query
   */
  items: TItem[]
  /**
   * The "last key" read, which can be used for subsequent queries or scans.
   * If this property isn't set then no more pages of results are available
   * @see `LastEvaluatedKey` at https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
   */
  lastEvaluatedKey?: DynamoDBValues
}
