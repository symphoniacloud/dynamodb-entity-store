import { DynamoDBValues, Entity } from './entities'
import { ConsumedCapacitiesMetadata, ReturnConsumedCapacityOption } from './singleEntityAdvancedOperations'
import { SkQueryRange } from './singleEntityOperations'

export interface QueryAndScanOptions extends ReturnConsumedCapacityOption {
  /**
   * See `Limit` at https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-dynamodb/Interface/QueryInput/
   * Defaults to no limit set
   */
  limit?: number

  /**
   * See `ExclusiveStartKey` at https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-dynamodb/Interface/QueryInput/
   */
  exclusiveStartKey?: DynamoDBValues

  /**
   * Determines the read consistency model: If set to true, then the operation uses strongly consistent reads; otherwise, the operation uses eventually consistent reads.
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html#DDB-Query-request-ConsistentRead
   * @default DynamoDB's default which is `false`
   */
  consistentRead?: boolean
}

export interface QueryOptions extends QueryAndScanOptions {
  /**
   * See `ScanIndexForward` at https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-dynamodb/Interface/QueryInput/
   * Defaults to not set, and therefore 'true' because of underlying implementation in AWS SDK
   */
  scanIndexForward?: boolean
}

export interface MultipleEntityOperations {
  query<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    options?: QueryOptions
  ): QueryMultipleBy<TPKSource>

  queryWithGsi<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource, TGSIPKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    options?: GsiQueryOptions
  ): QueryMultipleBy<TGSIPKSource>

  scan(options?: QueryAndScanOptions): Promise<MultipleEntityCollectionResponse>
}

export interface QueryMultipleBy<TQueryPK> {
  byPk(source: TQueryPK): Promise<MultipleEntityCollectionResponse>

  byPkAndSk(source: TQueryPK, queryRange: SkQueryRange): Promise<MultipleEntityCollectionResponse>
}

export interface MultipleEntityCollectionResponse {
  itemsByEntityType: Record<string, unknown[]>
  unparsedItems?: DynamoDBValues[]
  lastEvaluatedKey?: DynamoDBValues
  /**
   * Only set if consumedCapacities sub property has a value
   */
  metadata?: ConsumedCapacitiesMetadata
}

export interface GsiQueryOptions extends QueryOptions {
  /**
   * If an entity has multiple GSIs then this property must be used to specify which GSI to use
   */
  gsiId?: string
}
