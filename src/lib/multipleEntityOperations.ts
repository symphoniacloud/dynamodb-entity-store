import { DynamoDBValues, Entity } from './entities'
import { GsiQueryOptions, QueryAndScanOptions, QueryOptions, SkQueryRange } from './operationOptions'
import { ConsumedCapacitiesMetadata } from './operationResponses'

export interface MultipleEntityOperations {
  query<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    options?: QueryOptions
  ): QueryMultipleBy<TPKSource>

  queryWithGsi<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource, TGSIPKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    options?: GsiQueryOptions
  ): QueryMultipleBy<TGSIPKSource>

  scan(options?: QueryAndScanOptions): Promise<MultipleEntityCollectionResponse>
}

export interface QueryMultipleBy<TQueryPK> {
  byPk(source: TQueryPK): Promise<MultipleEntityCollectionResponse>

  byPkAndSk(source: TQueryPK, queryRange: SkQueryRange): Promise<MultipleEntityCollectionResponse>
}

export interface MultipleEntityCollectionResponse {
  itemsByEntityType: Record<string, unknown[]>
  unparsedItems?: DynamoDBValues[]
  lastEvaluatedKey?: DynamoDBValues
  /**
   * Only set if consumedCapacities sub property has a value
   */
  metadata?: ConsumedCapacitiesMetadata
}
