import { DynamoDBValues, Entity } from './entities'
import {
  AdvancedGsiQueryOnePageOptions,
  AdvancedQueryOnePageOptions,
  AdvancedScanOnePageOptions,
  ConsumedCapacitiesMetadata
} from './singleEntityAdvancedOperations'
import { SkQueryRange } from './singleEntityOperations'

// TODOEventually - all pages versions
export interface MultipleEntityOperations {
  queryOnePageByPk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    pkSource: TPKSource,
    options?: AdvancedQueryOnePageOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryOnePageByPkAndSk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    pkSource: TPKSource,
    queryRange: SkQueryRange,
    options?: AdvancedQueryOnePageOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryOnePageWithGsiByPk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource, TGSIPKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    pkSource: TGSIPKSource,
    options?: AdvancedGsiQueryOnePageOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryOnePageWithGsiByPkAndSk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource, TGSIPKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    pkSource: TGSIPKSource,
    queryRange: SkQueryRange,
    options?: AdvancedGsiQueryOnePageOptions
  ): Promise<MultipleEntityCollectionResponse>

  scanOnePage(options?: AdvancedScanOnePageOptions): Promise<MultipleEntityCollectionResponse>
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
