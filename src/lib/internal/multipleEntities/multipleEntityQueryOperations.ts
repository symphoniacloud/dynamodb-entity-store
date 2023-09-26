import { expressionAttributeParams } from '../common/operationsCommon'
import { MultipleEntityCollectionResponse } from '../../multipleEntityOperations'
import { EntityContext } from '../entityContext'
import { QueryCommandInput } from '@aws-sdk/lib-dynamodb'
import {
  EntityContextsByEntityType,
  performMultipleEntityOperationAndParse
} from './multipleEntitiesQueryAndScanCommon'
import { findGsiDetails } from '../common/gsiQueryCommon'
import { SkQueryRange } from '../../singleEntityOperations'
import { configureQueryOperation } from '../common/queryAndScanCommon'
import {
  AdvancedGsiQueryOnePageOptions,
  AdvancedQueryOnePageOptions
} from '../../singleEntityAdvancedOperations'
import { Entity } from '../../entities'
import { throwError } from '../../util'

export async function queryMultipleByPk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  contexts: EntityContextsByEntityType,
  keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
  pkSource: TPKSource,
  allPages: boolean,
  options: AdvancedQueryOnePageOptions = {}
): Promise<MultipleEntityCollectionResponse> {
  const keyEntityContext = findKeyEntityContext(contexts, keyEntity)
  return await queryMultipleWithCriteria(
    contexts,
    keyEntityContext,
    options,
    `${keyEntityContext.metaAttributeNames.pk} = :pk`,
    expressionAttributeParams({ ':pk': keyEntityContext.entity.pk(pkSource) }),
    allPages
  )
}

export async function queryMultipleBySkRange<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  contexts: EntityContextsByEntityType,
  keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
  pkSource: TPKSource,
  queryRange: SkQueryRange,
  allPages: boolean,
  options: AdvancedQueryOnePageOptions = {}
) {
  const keyEntityContext = findKeyEntityContext(contexts, keyEntity)
  if (!keyEntityContext.metaAttributeNames.sk)
    throw new Error('Unable to query by sk - table has no sort key')
  return await queryMultipleWithCriteria(
    contexts,
    keyEntityContext,
    options,
    `${keyEntityContext.metaAttributeNames.pk} = :pk and ${queryRange.skConditionExpressionClause}`,
    expressionAttributeParams(
      {
        ':pk': keyEntityContext.entity.pk(pkSource),
        ...queryRange.expressionAttributeValues
      },
      {
        '#sk': keyEntityContext.metaAttributeNames.sk
      }
    ),
    allPages
  )
}

export async function queryMultipleByGsiPk<
  TKeyItem extends TPKSource & TSKSource,
  TPKSource,
  TSKSource,
  TGSIPKSource
>(
  contexts: EntityContextsByEntityType,
  keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
  pkSource: TGSIPKSource,
  allPages: boolean,
  options: AdvancedGsiQueryOnePageOptions = {}
): Promise<MultipleEntityCollectionResponse> {
  const keyEntityContext = findKeyEntityContext(contexts, keyEntity)
  const gsiDetails = findGsiDetails(keyEntityContext, options)

  return await queryMultipleWithCriteria(
    contexts,
    keyEntityContext,
    options,
    `${gsiDetails.attributeNames.pk} = :pk`,
    {
      IndexName: gsiDetails.tableIndexName,
      ...expressionAttributeParams({ ':pk': gsiDetails.generators.pk(pkSource) })
    },
    allPages
  )
}

export async function queryMultipleByGsiSkRange<
  TKeyItem extends TPKSource & TSKSource,
  TPKSource,
  TSKSource,
  TGSIPKSource
>(
  contexts: EntityContextsByEntityType,
  keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
  pkSource: TGSIPKSource,
  queryRange: SkQueryRange,
  allPages: boolean,
  options: AdvancedGsiQueryOnePageOptions = {}
) {
  const keyEntityContext = findKeyEntityContext(contexts, keyEntity)
  const gsiDetails = findGsiDetails(keyEntityContext, options)
  if (!gsiDetails.attributeNames.sk)
    throw new Error('Unable to query by GSI sk - GSI on table has no sort key')

  return await queryMultipleWithCriteria(
    contexts,
    keyEntityContext,
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
    },
    allPages
  )
}

function findKeyEntityContext<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  contextsByEntityType: EntityContextsByEntityType,
  keyEntity: Entity<TKeyItem, TPKSource, TSKSource>
): EntityContext<TKeyItem, TPKSource, TSKSource> {
  return (
    (contextsByEntityType[keyEntity.type] as EntityContext<TKeyItem, TPKSource, TSKSource>) ??
    throwError(`Unable to find context for entity type ${keyEntity.type}`)()
  )
}

async function queryMultipleWithCriteria(
  contextsByEntityType: EntityContextsByEntityType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyEntityContext: EntityContext<any, any, any>,
  { scanIndexForward, ...otherOptions }: AdvancedQueryOnePageOptions,
  keyConditionExpression: string,
  partialCriteria: Omit<
    QueryCommandInput,
    'KeyConditionExpression' | 'TableName' | 'ExclusiveStartKey' | 'Limit' | 'ScanIndexForward'
  >,
  allPages: boolean
): Promise<MultipleEntityCollectionResponse> {
  return performMultipleEntityOperationAndParse(
    contextsByEntityType,
    configureQueryOperation(keyEntityContext, otherOptions, allPages, {
      KeyConditionExpression: keyConditionExpression,
      ...partialCriteria,
      ...(scanIndexForward === false ? { ScanIndexForward: scanIndexForward } : {})
    }),
    keyEntityContext
  )
}
