import { DynamoDBValues, Entity } from './entities'
import {
  ReturnConsumedCapacityOption,
  ReturnItemCollectionMetricsOption,
  ReturnValuesOnConditionCheckFailureOption
} from './advanced'
import { ConsumedCapacity } from '@aws-sdk/client-dynamodb'
import { DeleteOptions, PutOptions, UpdateOptions } from './singleEntityOperations'

// TOMAYBE - consider non builder versions
export interface TransactionOperations {
  buildWriteTransaction<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
    firstEntity: Entity<TItem, TPKSource, TSKSource>
  ): WriteTransactionBuilder<TItem, TPKSource, TSKSource>

  buildGetTransaction<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
    firstEntity: Entity<TItem, TPKSource, TSKSource>
  ): GetTransactionBuilder<TItem, TPKSource, TSKSource>
}

export interface WriteTransactionBuilder<TItem extends TPKSource & TSKSource, TPKSource, TSKSource> {
  put(item: TItem, options?: TransactionPutOptions): WriteTransactionBuilder<TItem, TPKSource, TSKSource>

  update<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options: TransactionUpdateOptions
  ): WriteTransactionBuilder<TItem, TPKSource, TSKSource>

  delete<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options?: TransactionDeleteOptions
  ): WriteTransactionBuilder<TItem, TPKSource, TSKSource>

  conditionCheck<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options?: TransactionConditionCheckOptions
  ): WriteTransactionBuilder<TItem, TPKSource, TSKSource>

  nextEntity<TNextItem extends TNextPKSource & TNextSKSource, TNextPKSource, TNextSKSource>(
    nextEntity: Entity<TNextItem, TNextPKSource, TNextSKSource>
  ): WriteTransactionBuilder<TNextItem, TNextPKSource, TNextSKSource>

  execute(options?: WriteTransactionOptions): Promise<WriteTransactionResponse>
}

export interface GetTransactionBuilder<TItem extends TPKSource & TSKSource, TPKSource, TSKSource> {
  get<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource
  ): GetTransactionBuilder<TItem, TPKSource, TSKSource>

  nextEntity<TNextItem extends TNextPKSource & TNextSKSource, TNextPKSource, TNextSKSource>(
    nextEntity: Entity<TNextItem, TNextPKSource, TNextSKSource>
  ): GetTransactionBuilder<TNextItem, TNextPKSource, TNextSKSource>

  execute(options?: GetTransactionOptions): Promise<GetTransactionResponse>
}

export type TransactionPutOptions = PutOptions & ReturnValuesOnConditionCheckFailureOption
export type TransactionUpdateOptions = UpdateOptions & ReturnValuesOnConditionCheckFailureOption
export type TransactionDeleteOptions = DeleteOptions & ReturnValuesOnConditionCheckFailureOption

export interface TransactionConditionCheckOptions {
  conditionExpression: string
  expressionAttributeValues?: DynamoDBValues
  expressionAttributeNames?: Record<string, string>
}

export interface WriteTransactionOptions
  extends ReturnConsumedCapacityOption,
    ReturnItemCollectionMetricsOption {
  clientRequestToken: string
}

export type GetTransactionOptions = ReturnConsumedCapacityOption

export interface WriteTransactionResponse {
  /**
   * Only set if any sub properties are set
   */
  metadata?: TransactionConsumedCapacityMetadata & TransactionCollectionMetricsMetadata
}

export interface GetTransactionResponse {
  /**
   * Each array is in the same order as the original request
   * Any elements that could not be found are represented by null in their corresponding array
   */
  itemsByEntityType: Record<string, unknown[]>
  metadata?: TransactionConsumedCapacityMetadata
}

export interface TransactionConsumedCapacityMetadata {
  /**
   * Only set if returnConsumedCapacity set appropriately on request
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactGetItems.html#API_TransactGetItems_ResponseElements
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html#API_TransactWriteItems_ResponseElements
   */
  consumedCapacity?: ConsumedCapacity[]
}

export interface TransactionCollectionMetricsMetadata {
  /**
   * Only set if returnItemCollectionMetrics set appropriately on request and item contained any collections
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html#API_TransactWriteItems_ResponseElements
   */
  itemCollectionMetrics?: Record<
    string,
    {
      SizeEstimateRangeGB?: number[]
      ItemCollectionKey?: DynamoDBValues
    }[]
  >
}
