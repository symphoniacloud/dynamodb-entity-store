import { DynamoDBValues, Entity } from './entities'
import {
  AdvancedGsiQueryAllOptions,
  AdvancedGsiQueryOnePageOptions,
  AdvancedQueryAllOptions,
  AdvancedQueryOnePageOptions,
  AdvancedScanAllOptions,
  AdvancedScanOnePageOptions,
  ConsumedCapacitiesMetadata
} from './singleEntityAdvancedOperations'
import { SkQueryRange } from './singleEntityOperations'

export interface MultipleEntityOperations {
  queryAllByPk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    pkSource: TPKSource,
    options?: AdvancedQueryAllOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryOnePageByPk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    pkSource: TPKSource,
    options?: AdvancedQueryOnePageOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryAllByPkAndSk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    pkSource: TPKSource,
    queryRange: SkQueryRange,
    options?: AdvancedQueryAllOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryOnePageByPkAndSk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    pkSource: TPKSource,
    queryRange: SkQueryRange,
    options?: AdvancedQueryOnePageOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryAllWithGsiByPk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource, TGSIPKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    pkSource: TGSIPKSource,
    options?: AdvancedGsiQueryAllOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryOnePageWithGsiByPk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource, TGSIPKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    pkSource: TGSIPKSource,
    options?: AdvancedGsiQueryOnePageOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryAllWithGsiByPkAndSk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource, TGSIPKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    pkSource: TGSIPKSource,
    queryRange: SkQueryRange,
    options?: AdvancedGsiQueryAllOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryOnePageWithGsiByPkAndSk<TKeyItem extends TPKSource & TSKSource, TPKSource, TSKSource, TGSIPKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, TSKSource>,
    pkSource: TGSIPKSource,
    queryRange: SkQueryRange,
    options?: AdvancedGsiQueryOnePageOptions
  ): Promise<MultipleEntityCollectionResponse>

  scanAll(options?: AdvancedScanAllOptions): Promise<MultipleEntityCollectionResponse>

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
