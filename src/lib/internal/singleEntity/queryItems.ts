import { EntityContext } from '../entityContext'
import {
  configureQueryOperation,
  executeQueryOrScan,
  parseResultsForEntity
} from '../common/queryAndScanCommon'
import { QueryCommandInput } from '@aws-sdk/lib-dynamodb'
import { AdvancedCollectionResponse, AdvancedQueryOnePageOptions } from '../../singleEntityAdvancedOperations'
import { expressionAttributeParams } from '../operationsCommon'
import { GsiDetails } from '../common/gsiQueryCommon'
import { SkQueryRange } from '../../singleEntityOperations'

export interface QueryCriteria {
  keyConditionExpression: string
  partialCriteria: Omit<
    QueryCommandInput,
    'KeyConditionExpression' | 'TableName' | 'ExclusiveStartKey' | 'Limit' | 'ScanIndexForward'
  >
}

export function pkQueryCriteria<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  { metaAttributeNames, entity }: EntityContext<TItem, TPKSource, TSKSource>,
  source: TPKSource
): QueryCriteria {
  return {
    keyConditionExpression: `${metaAttributeNames.pk} = :pk`,
    partialCriteria: expressionAttributeParams({ ':pk': entity.pk(source) })
  }
}

export function skRangeQueryCriteria<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  { metaAttributeNames, entity }: EntityContext<TItem, TPKSource, TSKSource>,
  pkSource: TPKSource,
  queryRange: SkQueryRange
): QueryCriteria {
  if (!metaAttributeNames.sk) throw new Error('Unable to query by sk - table has no sort key')
  return {
    keyConditionExpression: `${metaAttributeNames.pk} = :pk and ${queryRange.skConditionExpressionClause}`,
    partialCriteria: expressionAttributeParams(
      {
        ':pk': entity.pk(pkSource),
        ...queryRange.expressionAttributeValues
      },
      {
        '#sk': metaAttributeNames.sk
      }
    )
  }
}

export function gsiPkQueryCriteria(gsiDetails: GsiDetails, pkSource: unknown): QueryCriteria {
  return {
    keyConditionExpression: `${gsiDetails.attributeNames.pk} = :pk`,
    partialCriteria: {
      IndexName: gsiDetails.tableIndexName,
      ...expressionAttributeParams({ ':pk': gsiDetails.generators.pk(pkSource) })
    }
  }
}

export function gsiSkRangeQueryCriteria(
  gsiDetails: GsiDetails,
  pkSource: unknown,
  queryRange: SkQueryRange
): QueryCriteria {
  if (!gsiDetails.attributeNames.sk)
    throw new Error('Unable to query by GSI sk - GSI on table has no sort key')
  return {
    keyConditionExpression: `${gsiDetails.attributeNames.pk} = :pk and ${queryRange.skConditionExpressionClause}`,
    partialCriteria: {
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
  }
}

export async function queryItems<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  { keyConditionExpression, partialCriteria }: QueryCriteria,
  { scanIndexForward, ...otherOptions }: AdvancedQueryOnePageOptions,
  allPages: boolean
): Promise<AdvancedCollectionResponse<TItem>> {
  const queryConfig = configureQueryOperation(context, otherOptions, allPages, {
    KeyConditionExpression: keyConditionExpression,
    ...partialCriteria,
    ...(scanIndexForward === false ? { ScanIndexForward: scanIndexForward } : {})
  })
  const result = await executeQueryOrScan(queryConfig, context.logger, context.entity.type)
  return parseResultsForEntity(context, result)
}
