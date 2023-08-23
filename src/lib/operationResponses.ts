import { ConsumedCapacity, ItemCollectionMetrics } from '@aws-sdk/client-dynamodb'
import { Mandatory } from './util/types'
import { DynamoDBValues } from './entities'

export type PutResponse = WithUnparsedReturnedAttributes &
  WithConsumedCapacityAndItemCollectionMetricsMetadata

export type DeleteResponse = WithUnparsedReturnedAttributes &
  WithConsumedCapacityAndItemCollectionMetricsMetadata

export type UpdateResponse = WithUnparsedReturnedAttributes &
  WithConsumedCapacityAndItemCollectionMetricsMetadata

export interface GetResponse<TItem extends TPKSource & TSKSource, TPKSource, TSKSource> {
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
export type GetOrThrowResponse<TItem extends TPKSource & TSKSource, TPKSource, TSKSource> = Mandatory<
  GetResponse<TItem, TPKSource, TSKSource>,
  'item'
>

export interface CollectionResponse<TItem> {
  items: TItem[]
  unparsedItems?: DynamoDBValues[]
  lastEvaluatedKey?: DynamoDBValues
  /**
   * Only set if consumedCapacities sub property has a value
   */
  metadata?: ConsumedCapacitiesMetadata
}

export type BatchWriteResponse = {
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

export type BatchGetResponse<TItem extends TPKSource & TSKSource, TPKSource, TSKSource> = {
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
