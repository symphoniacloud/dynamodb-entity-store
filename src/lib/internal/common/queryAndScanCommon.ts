import { parseItem, returnConsumedCapacityParam } from '../operationsCommon'
import { DynamoDBValues } from '../../entities'
import { EntityStoreLogger, isDebugLoggingEnabled, removeNullOrUndefined } from '../../util'
import {
  QueryCommandInput,
  QueryCommandOutput,
  ScanCommandInput,
  ScanCommandOutput
} from '@aws-sdk/lib-dynamodb'
import { EntityContext } from '../entityContext'
import { MultipleEntityCollectionResponse } from '../../multipleEntityOperations'
import {
  AdvancedCollectionResponse,
  AdvancedQueryOnePageOptions,
  AdvancedScanOnePageOptions,
  ConsumedCapacitiesMetadata
} from '../../singleEntityAdvancedOperations'

export interface QueryScanOperationConfiguration<
  TCommandInput extends ScanCommandInput & QueryCommandInput,
  TCommandOutput extends ScanCommandOutput & QueryCommandOutput
> {
  operationParams: TCommandInput
  useAllPageOperation: boolean
  allPageOperation: (params: TCommandInput) => Promise<TCommandOutput[]>
  onePageOperation: (params: TCommandInput) => Promise<TCommandOutput>
}

export function configureScanOperation(
  { dynamoDB, tableName }: Pick<EntityContext<never, never, never>, 'tableName' | 'dynamoDB'>,
  options: AdvancedScanOnePageOptions,
  allPages: boolean
): QueryScanOperationConfiguration<ScanCommandInput, ScanCommandOutput> {
  return {
    ...configureOperation(tableName, options, allPages, undefined),
    allPageOperation: dynamoDB.scanAllPages,
    onePageOperation: dynamoDB.scanOnePage
  }
}

export function configureQueryOperation(
  { dynamoDB, tableName }: Pick<EntityContext<never, never, never>, 'tableName' | 'dynamoDB'>,
  options: AdvancedQueryOnePageOptions,
  allPages: boolean,
  queryParamsParts?: Omit<QueryCommandInput, 'TableName' | 'ExclusiveStartKey' | 'Limit'>
): QueryScanOperationConfiguration<QueryCommandInput, QueryCommandOutput> {
  return {
    ...configureOperation(tableName, options, allPages, queryParamsParts),
    allPageOperation: dynamoDB.queryAllPages,
    onePageOperation: dynamoDB.queryOnePage
  }
}

export function configureOperation(
  tableName: string,
  options: AdvancedQueryOnePageOptions,
  allPages: boolean,
  queryParamsParts?: Omit<QueryCommandInput, 'TableName' | 'ExclusiveStartKey' | 'Limit'>
): { operationParams: ScanCommandInput & QueryCommandInput; useAllPageOperation: boolean } {
  const { limit, exclusiveStartKey, consistentRead } = options
  return {
    operationParams: {
      TableName: tableName,
      ...(limit ? { Limit: limit } : {}),
      ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      ...(consistentRead !== undefined ? { ConsistentRead: consistentRead } : {}),
      ...(queryParamsParts ? queryParamsParts : {}),
      ...returnConsumedCapacityParam(options)
    },
    useAllPageOperation: allPages
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
): AdvancedCollectionResponse<TItem> {
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
