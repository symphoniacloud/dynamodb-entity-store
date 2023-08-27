import { EntityContext } from '../entityContext'
import { Entity } from '../../entities'
import { throwError } from '../../util/errors'
import {
  MultipleEntityCollectionResponse,
  QueryMultipleBy,
  QueryOptions
} from '../../multipleEntityOperations'
import {
  queryMultipleByGsiPk,
  queryMultipleByGsiSkRange,
  queryMultipleByPk,
  queryMultipleBySkRange
} from './multipleEntityQueryOperations'
import { findGsiDetails } from '../common/gsiQueryCommon'
import { SkQueryRange } from '../../singleEntityOperations'

function findKeyEntityContext<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  contextsByEntityType: Record<string, EntityContext<unknown, unknown, unknown>>,
  keyEntity: Entity<TKeyItem, TPKSource, TSKSource>
): EntityContext<TKeyItem, TPKSource, TSKSource> {
  return (
    (contextsByEntityType[keyEntity.type] as EntityContext<TKeyItem, TPKSource, TSKSource>) ??
    throwError(`Unable to find context for entity type ${keyEntity.type}`)()
  )
}

export function queryMultipleByTable<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  contextsByEntityType: Record<string, EntityContext<unknown, unknown, unknown>>,
  keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
  options: QueryOptions
): QueryMultipleBy<TPKSource> {
  const queryContext = { ...findKeyEntityContext(contextsByEntityType, keyEntity), options }

  return {
    async byPk(source: TPKSource): Promise<MultipleEntityCollectionResponse> {
      return await queryMultipleByPk(contextsByEntityType, queryContext, options, source)
    },
    async byPkAndSk(
      pkSource: TPKSource,
      queryRange: SkQueryRange
    ): Promise<MultipleEntityCollectionResponse> {
      return await queryMultipleBySkRange(contextsByEntityType, queryContext, options, pkSource, queryRange)
    }
  }
}

export function queryMultipleByGsi<
  TKeyItem extends TPKSource & TSKSource,
  TPKSource,
  TSKSource,
  TKeyEntityGSIPKSource
>(
  contextsByEntityType: Record<string, EntityContext<unknown, unknown, unknown>>,
  keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
  options: QueryOptions
): QueryMultipleBy<TKeyEntityGSIPKSource> {
  const keyEntityContext = findKeyEntityContext(contextsByEntityType, keyEntity)
  const gsiDetails = findGsiDetails(keyEntityContext, options)

  return {
    async byPk(source: TKeyEntityGSIPKSource): Promise<MultipleEntityCollectionResponse> {
      return await queryMultipleByGsiPk(contextsByEntityType, keyEntityContext, options, gsiDetails, source)
    },
    async byPkAndSk(
      pkSource: TKeyEntityGSIPKSource,
      queryRange: SkQueryRange
    ): Promise<MultipleEntityCollectionResponse> {
      return await queryMultipleByGsiSkRange(
        contextsByEntityType,
        keyEntityContext,
        options,
        gsiDetails,
        pkSource,
        queryRange
      )
    }
  }
}
