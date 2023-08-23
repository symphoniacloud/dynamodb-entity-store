import { EntityContext } from '../entityContext'
import { GsiQueryOptions, SkQueryRange } from '../../operationOptions'
import { QueryBy } from '../../singleEntityOperations'
import { CollectionResponse } from '../../operationResponses'
import { expressionAttributeParams } from '../operationsCommon'
import { findGsiDetails, GsiDetails } from '../common/gsiQueryCommon'
import { QueryCriteria, queryItems } from './queryItems'

export function queryByGsi<TItem extends TPKSource & TSKSource, TPKSource, TSKSource, TGSIPKSource>(
  entityContext: EntityContext<TItem, TPKSource, TSKSource>,
  options: GsiQueryOptions
): QueryBy<TItem, TGSIPKSource> {
  const gsiDetails = findGsiDetails(entityContext, options)

  async function performQuery(criteria: QueryCriteria) {
    return await queryItems(entityContext, criteria, options)
  }

  return {
    async byPk(source: TGSIPKSource): Promise<CollectionResponse<TItem>> {
      return await performQuery(gsiPkQueryCriteria(gsiDetails, source))
    },
    async byPkAndSk(pkSource: TGSIPKSource, queryRange: SkQueryRange): Promise<CollectionResponse<TItem>> {
      return await performQuery(gsiSkRangeQueryCriteria(gsiDetails, pkSource, queryRange))
    }
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
