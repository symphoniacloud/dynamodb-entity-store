import { expressionAttributeParams } from '../common/operationsCommon.js'
import { MultipleEntityCollectionResponse } from '../../multipleEntityOperations.js'
import { EntityContext } from '../entityContext.js'
import { QueryCommandInput } from '@aws-sdk/lib-dynamodb'
import {
  EntityContextsByEntityType,
  performMultipleEntityOperationAndParse
} from './multipleEntitiesQueryAndScanCommon.js'
import { findGsiDetails } from '../common/gsiQueryCommon.js'
import { SkQueryRange } from '../../singleEntityOperations.js'
import { configureQueryOperation } from '../common/queryAndScanCommon.js'
import {
  AdvancedGsiQueryOnePageOptions,
  AdvancedQueryOnePageOptions
} from '../../singleEntityAdvancedOperations.js'
import { Entity } from '../../entities.js'
import { throwError } from '../../util/index.js'

export async function queryMultipleByPk<TKeyItem extends TPKSource, TPKSource>(
  contexts: EntityContextsByEntityType,
  keyEntity: Entity<TKeyItem, TPKSource, unknown>,
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

export async function queryMultipleBySkRange<TKeyItem extends TPKSource, TPKSource>(
  contexts: EntityContextsByEntityType,
  keyEntity: Entity<TKeyItem, TPKSource, unknown>,
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

export async function queryMultipleByGsiPk<TKeyItem, TGSIPKSource>(
  contexts: EntityContextsByEntityType,
  keyEntity: Entity<TKeyItem, unknown, unknown>,
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

export async function queryMultipleByGsiSkRange<TKeyItem, TGSIPKSource>(
  contexts: EntityContextsByEntityType,
  keyEntity: Entity<TKeyItem, unknown, unknown>,
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

function findKeyEntityContext<TKeyItem>(
  contextsByEntityType: EntityContextsByEntityType,
  keyEntity: Entity<TKeyItem, unknown, unknown>
): EntityContext<TKeyItem, unknown, unknown> {
  return (
    (contextsByEntityType[keyEntity.type] as EntityContext<TKeyItem, unknown, unknown>) ??
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
