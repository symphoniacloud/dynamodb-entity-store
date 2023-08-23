import { EntityContext } from '../entityContext'
import { QueryOptions, SkQueryRange } from '../../operationOptions'
import { QueryBy } from '../../singleEntityOperations'
import { CollectionResponse } from '../../operationResponses'
import { expressionAttributeParams } from '../operationsCommon'
import { QueryCriteria, queryItems } from './queryItems'

export function queryByTable<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  entityContext: EntityContext<TItem, TPKSource, TSKSource>,
  options: QueryOptions
): QueryBy<TItem, TPKSource> {
  async function performQuery(criteria: QueryCriteria) {
    return await queryItems(entityContext, criteria, options)
  }

  return {
    async byPk(source: TPKSource): Promise<CollectionResponse<TItem>> {
      return await performQuery(pkQueryCriteria(entityContext, source))
    },
    async byPkAndSk(pkSource: TPKSource, queryRange: SkQueryRange): Promise<CollectionResponse<TItem>> {
      return await performQuery(skRangeQueryCriteria(entityContext, pkSource, queryRange))
    }
  }
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
