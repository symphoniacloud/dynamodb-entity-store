import { expressionAttributeParams } from '../operationsCommon'
import { MultipleEntityCollectionResponse } from '../../multipleEntityOperations'
import { EntityContext } from '../entityContext'
import { QueryCommandInput } from '@aws-sdk/lib-dynamodb'
import { performMultipleEntityOperationAndParse } from './multipleEntitiesQueryAndScanCommon'
import { QueryOptions, SkQueryRange } from '../../operationOptions'
import { configureQueryOperation } from '../common/queryCommon'
import { GsiDetails } from '../common/gsiQueryCommon'

export async function queryMultipleByPk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  contextsByEntityType: Record<string, EntityContext<unknown, unknown, unknown>>,
  keyItemContext: EntityContext<TKeyItem, TPKSource, TSKSource>,
  options: QueryOptions,
  source: TPKSource
): Promise<MultipleEntityCollectionResponse> {
  return await queryMultipleWithCriteria(
    contextsByEntityType,
    keyItemContext,
    options,
    `${keyItemContext.metaAttributeNames.pk} = :pk`,
    expressionAttributeParams({ ':pk': keyItemContext.entity.pk(source) })
  )
}

export async function queryMultipleBySkRange<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  contextsByEntityType: Record<string, EntityContext<unknown, unknown, unknown>>,
  keyItemContext: EntityContext<TKeyItem, TPKSource, TSKSource>,
  options: QueryOptions,
  source: TPKSource,
  queryRange: SkQueryRange
) {
  if (!keyItemContext.metaAttributeNames.sk) throw new Error('Unable to query by sk - table has no sort key')
  return await queryMultipleWithCriteria(
    contextsByEntityType,
    keyItemContext,
    options,
    `${keyItemContext.metaAttributeNames.pk} = :pk and ${queryRange.skConditionExpressionClause}`,
    expressionAttributeParams(
      {
        ':pk': keyItemContext.entity.pk(source),
        ...queryRange.expressionAttributeValues
      },
      {
        '#sk': keyItemContext.metaAttributeNames.sk
      }
    )
  )
}

export async function queryMultipleByGsiPk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  contextsByEntityType: Record<string, EntityContext<unknown, unknown, unknown>>,
  keyItemContext: EntityContext<TKeyItem, TPKSource, TSKSource>,
  options: QueryOptions,
  gsiDetails: GsiDetails,
  pkSource: unknown
): Promise<MultipleEntityCollectionResponse> {
  return await queryMultipleWithCriteria(
    contextsByEntityType,
    keyItemContext,
    options,
    `${gsiDetails.attributeNames.pk} = :pk`,
    {
      IndexName: gsiDetails.tableIndexName,
      ...expressionAttributeParams({ ':pk': gsiDetails.generators.pk(pkSource) })
    }
  )
}

export async function queryMultipleByGsiSkRange<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  contextsByEntityType: Record<string, EntityContext<unknown, unknown, unknown>>,
  keyItemContext: EntityContext<TKeyItem, TPKSource, TSKSource>,
  options: QueryOptions,
  gsiDetails: GsiDetails,
  pkSource: unknown,
  queryRange: SkQueryRange
) {
  if (!gsiDetails.attributeNames.sk)
    throw new Error('Unable to query by GSI sk - GSI on table has no sort key')

  return await queryMultipleWithCriteria(
    contextsByEntityType,
    keyItemContext,
    options,
    `${gsiDetails.attributeNames.pk} = :pk and ${queryRange.skConditionExpressionClause}`,
    {
      IndexName: gsiDetails.tableIndexName,
      ...expressionAttributeParams(
        {
          ':pk': gsiDetails.generators.pk(pkSource),
          ...queryRange.expressionAttributeValues
        },
        {
          '#sk': gsiDetails.attributeNames.sk,
          ...queryRange.expressionAttributeNames
        }
      )
    }
  )
}

async function queryMultipleWithCriteria(
  contextsByEntityType: Record<string, EntityContext<unknown, unknown, unknown>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyItemContext: EntityContext<any, any, any>,
  { scanIndexForward, ...otherOptions }: QueryOptions,
  keyConditionExpression: string,
  partialCriteria: Omit<
    QueryCommandInput,
    'KeyConditionExpression' | 'TableName' | 'ExclusiveStartKey' | 'Limit' | 'ScanIndexForward'
  >
): Promise<MultipleEntityCollectionResponse> {
  const {
    metaAttributeNames: { entityType: entityTypeAttributeName }
  } = keyItemContext

  if (!entityTypeAttributeName)
    throw new Error(
      `Unable to operate on multiple entities - no entityType attribute is configured for table`
    )

  return performMultipleEntityOperationAndParse(
    contextsByEntityType,
    configureQueryOperation(keyItemContext, otherOptions, {
      KeyConditionExpression: keyConditionExpression,
      ...partialCriteria,
      ...(scanIndexForward === false ? { ScanIndexForward: scanIndexForward } : {})
    }),
    keyItemContext
  )
}
