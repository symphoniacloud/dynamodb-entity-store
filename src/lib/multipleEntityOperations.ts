import { DynamoDBValues, Entity } from './entities'
import {
  AdvancedGsiQueryOnePageOptions,
  AdvancedQueryOnePageOptions,
  AdvancedScanOnePageOptions,
  ConsumedCapacitiesMetadata
} from './singleEntityAdvancedOperations'
import { SkQueryRange } from './singleEntityOperations'

export interface MultipleEntityOperations {
  query<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    options?: AdvancedQueryOnePageOptions
  ): QueryMultipleBy<TPKSource>

  queryWithGsi<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource, TGSIPKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    options?: AdvancedGsiQueryOnePageOptions
  ): QueryMultipleBy<TGSIPKSource>

  scanOnePage(options?: AdvancedScanOnePageOptions): Promise<MultipleEntityCollectionResponse>
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
