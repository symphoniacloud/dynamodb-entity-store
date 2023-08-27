import { ConsumedCapacity, ItemCollectionMetrics } from '@aws-sdk/client-dynamodb'
import { DynamoDBValues } from '../entities'
import { Mandatory } from '../util'

export type AdvancedPutResponse = WithUnparsedReturnedAttributes &
  WithConsumedCapacityAndItemCollectionMetricsMetadata

export type AdvancedDeleteResponse = WithUnparsedReturnedAttributes &
  WithConsumedCapacityAndItemCollectionMetricsMetadata

export type AdvancedUpdateResponse = WithUnparsedReturnedAttributes &
  WithConsumedCapacityAndItemCollectionMetricsMetadata

export interface AdvancedGetResponse<TItem extends TPKSource & TSKSource, TPKSource, TSKSource> {
  /**
   * Set if item existed in table
   */
  item?: TItem
  /**
   * Only set if consumedCapacity sub property has a value
   */
  metadata?: ConsumedCapacityMetadata
}

/**
 * item field always included, since if it didn't exist on table then error thrown instead
 */
export type AdvancedGetOrThrowResponse<TItem extends TPKSource & TSKSource, TPKSource, TSKSource> = Mandatory<
  AdvancedGetResponse<TItem, TPKSource, TSKSource>,
  'item'
>

export interface WithUnparsedReturnedAttributes {
  /**
   * Only set if returnValues set appropriately on request
   * Equal to "Attributes" at https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html#API_PutItem_ResponseElements
   */
  unparsedReturnedAttributes?: DynamoDBValues
}

export interface WithConsumedCapacityAndItemCollectionMetricsMetadata {
  /**
   * Only set if any sub properties are set
   */
  metadata?: ConsumedCapacityMetadata & ItemCollectionMetricsMetadata
}

export interface ConsumedCapacityMetadata {
  /**
   * Only set if returnConsumedCapacity set appropriately on request
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_ConsumedCapacity.html
   */
  consumedCapacity?: ConsumedCapacity
}

export interface ConsumedCapacitiesMetadata {
  /**
   * Only set if returnConsumedCapacity set appropriately on request.
   * Collection / Batch Results will contain one item per DynamoDB request per table. In the case of
   * single page operations this will be an array of length 1
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_ConsumedCapacity.html
   */
  consumedCapacities?: ConsumedCapacity[]
}

export interface ItemCollectionMetricsMetadata {
  /**
   * Only set if returnItemCollectionMetrics set appropriately on request and item contained any collections
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_ItemCollectionMetrics.html
   */
  itemCollectionMetrics?: ItemCollectionMetrics
}

export interface ItemCollectionMetricsCollectionMetadata {
  /**
   * Only set if returnItemCollectionMetrics set appropriately on request and item(s) contained any collections
   * Batch results will contain one item per DynamoDB request. In the case of
   * single page operations this will be an array of length 1
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_ItemCollectionMetrics.html
   */
  itemCollectionMetricsCollection?: ItemCollectionMetrics[]
}

export interface AdvancedCollectionResponse<TItem> {
  items: TItem[]
  unparsedItems?: DynamoDBValues[]
  lastEvaluatedKey?: DynamoDBValues
  /**
   * Only set if consumedCapacities sub property has a value
   */
  metadata?: ConsumedCapacitiesMetadata
}

export type AdvancedBatchWriteResponse = {
  /**
   * Only set if DynamoDB returned any unprocessed items
   */
  unprocessedItems?: {
    PutRequest?: {
      Item: DynamoDBValues | undefined
    }
    DeleteRequest?: {
      Key: DynamoDBValues | undefined
    }
  }[]
  /**
   * Only set if any sub properties are set
   */
  metadata?: ConsumedCapacitiesMetadata & ItemCollectionMetricsCollectionMetadata
}
export type AdvancedBatchGetResponse<TItem extends TPKSource & TSKSource, TPKSource, TSKSource> = {
  items: TItem[]
  /**
   * Only set if DynamoDB returned any unprocessed keys
   */
  unprocessedKeys?: DynamoDBValues[]
  /**
   * Only set if any sub properties are set
   */
  metadata?: ConsumedCapacitiesMetadata
}
