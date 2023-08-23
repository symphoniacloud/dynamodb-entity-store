import { QueryAndScanOptions } from '../../operationOptions'
import { parseItem, returnConsumedCapacityParam } from '../operationsCommon'
import { DynamoDBValues } from '../../entities'
import { EntityStoreLogger, isDebugLoggingEnabled } from '../../util/logger'
import {
  QueryCommandInput,
  QueryCommandOutput,
  ScanCommandInput,
  ScanCommandOutput
} from '@aws-sdk/lib-dynamodb'
import { EntityContext } from '../entityContext'
import { MultipleEntityCollectionResponse } from '../../multipleEntityOperations'
import { removeNullOrUndefined } from '../../util/collections'
import { CollectionResponse, ConsumedCapacitiesMetadata } from '../../operationResponses'

export interface QueryScanOperationConfiguration<
  TCommandInput extends ScanCommandInput & QueryCommandInput,
  TCommandOutput extends ScanCommandOutput & QueryCommandOutput
> {
  operationParams: TCommandInput
  useAllPageOperation: boolean
  allPageOperation: (params: TCommandInput) => Promise<TCommandOutput[]>
  onePageOperation: (params: TCommandInput) => Promise<TCommandOutput>
}

export function configureOperation(
  tableName: string,
  options: QueryAndScanOptions,
  queryParamsParts?: Omit<QueryCommandInput, 'TableName' | 'ExclusiveStartKey' | 'Limit'>
): { operationParams: ScanCommandInput & QueryCommandInput; useAllPageOperation: boolean } {
  const { allPages, limit, exclusiveStartKey } = options
  return {
    operationParams: {
      TableName: tableName,
      ...(limit ? { Limit: limit } : {}),
      ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      ...(queryParamsParts ? queryParamsParts : {}),
      ...returnConsumedCapacityParam(options)
    },
    useAllPageOperation:
      allPages !== undefined && allPages && limit === undefined && exclusiveStartKey === undefined
  }
}

export interface UnparsedCollectionResult {
  items: DynamoDBValues[]
  lastEvaluatedKey?: DynamoDBValues
  metadata?: ConsumedCapacitiesMetadata
}

export async function executeQueryOrScan<
  TCommandInput extends ScanCommandInput & QueryCommandInput,
  TCommandOutput extends ScanCommandOutput & QueryCommandOutput
>(
  {
    operationParams,
    useAllPageOperation,
    allPageOperation,
    onePageOperation
  }: QueryScanOperationConfiguration<TCommandInput, TCommandOutput>,
  logger: EntityStoreLogger,
  entityType?: string
): Promise<UnparsedCollectionResult> {
  if (isDebugLoggingEnabled(logger)) {
    logger.debug(
      `Attempting to query or scan ${
        entityType ? `entity ${entityType}` : `table ${operationParams.TableName}`
      }`,
      {
        useAllPageOperation,
        operationParams
      }
    )
  }

  async function performAllPageOperation(): Promise<UnparsedCollectionResult> {
    const result = await allPageOperation(operationParams)
    // No need to log - each page logged at lower level
    const lastPage = result[result.length - 1]
    const consumedCapacities = removeNullOrUndefined(result.map((page) => page.ConsumedCapacity))
    return {
      items: result.map((page) => page.Items || []).flat(),
      ...(lastPage.LastEvaluatedKey ? { lastEvaluatedKey: lastPage.LastEvaluatedKey } : {}),
      ...(consumedCapacities.length > 0 ? { metadata: { consumedCapacities: consumedCapacities } } : {})
    }
  }

  async function performOnePageOperation(): Promise<UnparsedCollectionResult> {
    const result = await onePageOperation(operationParams)
    if (isDebugLoggingEnabled(logger)) {
      logger.debug(`Query or scan result`, { result })
    }
    return {
      items: result.Items ?? [],
      ...(result.LastEvaluatedKey ? { lastEvaluatedKey: result.LastEvaluatedKey } : {}),
      ...(result.ConsumedCapacity ? { metadata: { consumedCapacities: [result.ConsumedCapacity] } } : {})
    }
  }

  return useAllPageOperation ? await performAllPageOperation() : await performOnePageOperation()
}

export function commonCollectionResponseElements(
  unparsedItems: DynamoDBValues[],
  unparsedResult: UnparsedCollectionResult
): Pick<MultipleEntityCollectionResponse, 'unparsedItems' | 'lastEvaluatedKey' | 'metadata'> {
  return {
    ...(unparsedItems.length > 0 ? { unparsedItems: unparsedItems } : {}),
    ...(unparsedResult.lastEvaluatedKey ? { lastEvaluatedKey: unparsedResult.lastEvaluatedKey } : {}),
    ...(unparsedResult.metadata ? { metadata: unparsedResult.metadata } : {})
  }
}

export function parseResultsForEntity<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  unparsedResult: UnparsedCollectionResult
): CollectionResponse<TItem> {
  const entityTypeAttributeName = context.metaAttributeNames.entityType
  const { parsedItems, unparsedItems } = unparsedResult.items.reduce(
    (accum, item: DynamoDBValues) => {
      const parseable = !entityTypeAttributeName || item[entityTypeAttributeName] === context.entity.type
      if (parseable) accum.parsedItems.push(parseItem(context, item))
      else accum.unparsedItems.push(item)
      return accum
    },
    {
      parsedItems: [],
      unparsedItems: []
    }
  )

  return {
    items: parsedItems,
    ...commonCollectionResponseElements(unparsedItems, unparsedResult)
  }
}
