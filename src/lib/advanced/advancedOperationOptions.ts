import {
  ReturnConsumedCapacity,
  ReturnItemCollectionMetrics,
  ReturnValue,
  ReturnValuesOnConditionCheckFailure
} from '@aws-sdk/client-dynamodb'
import { DeleteOptions, GetOptions, PutOptions, UpdateOptions } from '../singleEntityOperations'

export type AdvancedPutOptions = PutOptions &
  ReturnConsumedCapacityOption &
  ReturnValuesOptions &
  ReturnItemCollectionMetricsOption

export type AdvancedUpdateOptions = UpdateOptions &
  ReturnConsumedCapacityOption &
  ReturnValuesOptions &
  ReturnItemCollectionMetricsOption

export type AdvancedGetOptions = GetOptions & ReturnConsumedCapacityOption

export type AdvancedDeleteOptions = DeleteOptions &
  ReturnConsumedCapacityOption &
  ReturnItemCollectionMetricsOption &
  ReturnValuesOptions

//
// export interface QueryAndScanOptions extends ReturnConsumedCapacityOption {
//   /**
//    * See `Limit` at https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-dynamodb/Interface/QueryInput/
//    * If `limit` is set then only one page is queried from DynamoDB, even if `allPages` is set to true
//    * Defaults to no limit set
//    */
//   limit?: number
//
//   /**
//    * See `ExclusiveStartKey` at at https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-dynamodb/Interface/QueryInput/
//    * If `exclusiveStartKey` is set then only one page is queried from DynamoDB, even if `allPages` is set to true. This is because
//    *   `exclusiveStartKey` is only set for a previously paged operation which returned a value for lastEvaluatedKey.
//    */
//   exclusiveStartKey?: DynamoDBValues
//
//   /**
//    * Whether to retrieve all available pages. Defaults to false, and if `limit` or `exclusiveStartKey` is set then this setting is overridden to false.
//    * WARNING - this WILL result in many calls to DynamoDB for large result sets, leading to cost impacts and possibly causing throttling, so use with caution!
//    */
//   allPages?: boolean
// }
//
//
export interface ReturnConsumedCapacityOption {
  // See https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html#DDB-GetItem-request-ReturnConsumedCapacity
  returnConsumedCapacity?: ReturnConsumedCapacity | string
}

export interface ReturnValuesOnConditionCheckFailureOption {
  /**
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html#DDB-PutItem-request-ReturnValuesOnConditionCheckFailure
   */
  returnValuesOnConditionCheckFailure?: ReturnValuesOnConditionCheckFailure | string
}

export interface ReturnValuesOptions extends ReturnValuesOnConditionCheckFailureOption {
  /**
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html#DDB-PutItem-request-ReturnValues
   */
  returnValues?: ReturnValue | string
}

export interface ReturnItemCollectionMetricsOption {
  // See https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html#DDB-PutItem-request-ReturnItemCollectionMetrics
  returnItemCollectionMetrics?: ReturnItemCollectionMetrics | string
}

export interface WithTTL {
  // Sets absolute TTL value on record, if TTL attribute configured for table
  ttl?: number
  // Sets TTL value on record with a relative value - now + number of days in the future
  // If the ttl attribute is set then this value is ignored
  // DynamoDB only guarantees TTL cleanup precision within a day or so
  ttlInFutureDays?: number
}

export interface BatchOptions {
  batchSize: number
}

export type BatchPutOptions = WithTTL &
  BatchOptions &
  ReturnConsumedCapacityOption &
  ReturnItemCollectionMetricsOption

export type BatchDeleteOptions = BatchOptions &
  ReturnConsumedCapacityOption &
  ReturnItemCollectionMetricsOption

export type BatchGetOptions = BatchOptions & AdvancedGetOptions

//
// export interface QueryOptions extends QueryAndScanOptions {
//   /**
//    * See `ScanIndexForward` at https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-dynamodb/Interface/QueryInput/
//    * Defaults to not set, and therefore 'true' because of underlying implementation in AWS SDK
//    */
//   scanIndexForward?: boolean
// }
//
// export interface GsiQueryOptions extends QueryOptions {
//   /**
//    * If an entity has multiple GSIs then this property must be used to specify which GSI to use
//    */
//   gsiId?: string
// }
//
// export interface SkQueryRange extends WithExpression {
//   skConditionExpressionClause: string
// }
