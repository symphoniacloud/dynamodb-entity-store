import {
  DeleteOptions,
  GetOptions,
  GsiQueryAllOptions,
  GsiQueryOnePageOptions,
  GsiScanAllOptions,
  GsiScanOnePageOptions,
  OnePageResponse,
  PutOptions,
  QueryAllOptions,
  QueryOnePageOptions,
  ScanAllOptions,
  ScanOnePageOptions,
  SkQueryRange,
  UpdateOptions
} from './singleEntityOperations'
import {
  ConsumedCapacity,
  ItemCollectionMetrics,
  ReturnConsumedCapacity,
  ReturnItemCollectionMetrics,
  ReturnValue,
  ReturnValuesOnConditionCheckFailure
} from '@aws-sdk/client-dynamodb'
import { DynamoDBValues } from './entities'
import { Mandatory } from './util'

export interface SingleEntityAdvancedOperations<TItem extends TPKSource & TSKSource, TPKSource, TSKSource> {
  put(item: TItem, options?: AdvancedPutOptions): Promise<AdvancedPutResponse>

  update<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options: AdvancedUpdateOptions
  ): Promise<AdvancedUpdateResponse>

  getOrUndefined<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options?: AdvancedGetOptions
  ): Promise<AdvancedGetResponse<TItem, TPKSource, TSKSource>>

  getOrThrow<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options?: AdvancedGetOptions
  ): Promise<AdvancedGetOrThrowResponse<TItem, TPKSource, TSKSource>>

  delete<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options?: AdvancedDeleteOptions
  ): Promise<AdvancedDeleteResponse>

  queryAllByPk(
    pkSource: TPKSource,
    options?: AdvancedQueryAllOptions
  ): Promise<AdvancedCollectionResponse<TItem>>

  queryOnePageByPk(
    pkSource: TPKSource,
    options?: AdvancedQueryOnePageOptions
  ): Promise<AdvancedCollectionResponse<TItem>>

  queryAllByPkAndSk(
    pkSource: TPKSource,
    queryRange: SkQueryRange,
    options?: AdvancedQueryAllOptions
  ): Promise<AdvancedCollectionResponse<TItem>>

  queryOnePageByPkAndSk(
    pkSource: TPKSource,
    queryRange: SkQueryRange,
    options?: AdvancedQueryOnePageOptions
  ): Promise<AdvancedCollectionResponse<TItem>>

  queryAllWithGsiByPk<TGSIPKSource>(
    pkSource: TGSIPKSource,
    options?: AdvancedGsiQueryAllOptions
  ): Promise<AdvancedCollectionResponse<TItem>>

  queryOnePageWithGsiByPk<TGSIPKSource>(
    pkSource: TGSIPKSource,
    options?: AdvancedGsiQueryOnePageOptions
  ): Promise<AdvancedCollectionResponse<TItem>>

  queryAllWithGsiByPkAndSk<TGSIPKSource>(
    pkSource: TGSIPKSource,
    queryRange: SkQueryRange,
    options?: AdvancedGsiQueryAllOptions
  ): Promise<AdvancedCollectionResponse<TItem>>

  queryOnePageWithGsiByPkAndSk<TGSIPKSource>(
    pkSource: TGSIPKSource,
    queryRange: SkQueryRange,
    options?: AdvancedGsiQueryOnePageOptions
  ): Promise<AdvancedCollectionResponse<TItem>>

  scanAll(options?: AdvancedScanAllOptions): Promise<AdvancedCollectionResponse<TItem>>

  scanOnePage(options?: AdvancedScanOnePageOptions): Promise<AdvancedCollectionResponse<TItem>>

  scanAllWithGsi(options?: AdvancedGsiScanAllOptions): Promise<AdvancedCollectionResponse<TItem>>

  scanOnePageWithGsi(options?: AdvancedGsiScanOnePageOptions): Promise<AdvancedCollectionResponse<TItem>>

  batchPut(items: TItem[], options?: BatchPutOptions): Promise<AdvancedBatchWriteResponse>

  batchDelete<TKeySource extends TPKSource & TSKSource>(
    keySources: TKeySource[],
    options?: BatchDeleteOptions
  ): Promise<AdvancedBatchWriteResponse>

  batchGet<TKeySource extends TPKSource & TSKSource>(
    keySources: TKeySource[],
    options?: BatchGetOptions
  ): Promise<AdvancedBatchGetResponse<TItem, TPKSource, TSKSource>>
}

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

export type AdvancedQueryAllOptions = QueryAllOptions & ReturnConsumedCapacityOption

export type AdvancedQueryOnePageOptions = QueryOnePageOptions & ReturnConsumedCapacityOption

export type AdvancedGsiQueryAllOptions = GsiQueryAllOptions & ReturnConsumedCapacityOption

export type AdvancedGsiQueryOnePageOptions = GsiQueryOnePageOptions & ReturnConsumedCapacityOption

export type AdvancedScanAllOptions = ScanAllOptions & ReturnConsumedCapacityOption

export type AdvancedScanOnePageOptions = ScanOnePageOptions & ReturnConsumedCapacityOption

export type AdvancedGsiScanAllOptions = GsiScanAllOptions & ReturnConsumedCapacityOption

export type AdvancedGsiScanOnePageOptions = GsiScanOnePageOptions & ReturnConsumedCapacityOption

export type BatchPutOptions = BatchOptions &
  ReturnConsumedCapacityOption &
  ReturnItemCollectionMetricsOption & {
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

export type BatchDeleteOptions = BatchOptions &
  ReturnConsumedCapacityOption &
  ReturnItemCollectionMetricsOption

export type BatchGetOptions = BatchOptions & AdvancedGetOptions

export interface BatchOptions {
  batchSize: number
}

export interface ReturnConsumedCapacityOption {
  /**
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html#DDB-GetItem-request-ReturnConsumedCapacity
   */
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
  /**
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html#DDB-PutItem-request-ReturnItemCollectionMetrics
   */
  returnItemCollectionMetrics?: ReturnItemCollectionMetrics | string
}

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

export interface AdvancedCollectionResponse<TItem> extends OnePageResponse<TItem> {
  unparsedItems?: DynamoDBValues[]
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
