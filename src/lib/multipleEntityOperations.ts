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
  queryAllByPk<TKeyItem extends TPKSource, TPKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, unknown>,
    pkSource: TPKSource,
    options?: AdvancedQueryAllOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryOnePageByPk<TKeyItem extends TPKSource, TPKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, unknown>,
    pkSource: TPKSource,
    options?: AdvancedQueryOnePageOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryAllByPkAndSk<TKeyItem extends TPKSource, TPKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, unknown>,
    pkSource: TPKSource,
    queryRange: SkQueryRange,
    options?: AdvancedQueryAllOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryOnePageByPkAndSk<TKeyItem extends TPKSource, TPKSource>(
    keyEntity: Entity<TKeyItem, TPKSource, unknown>,
    pkSource: TPKSource,
    queryRange: SkQueryRange,
    options?: AdvancedQueryOnePageOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryAllWithGsiByPk<TKeyItem, TGSIPKSource>(
    keyEntity: Entity<TKeyItem, unknown, unknown>,
    pkSource: TGSIPKSource,
    options?: AdvancedGsiQueryAllOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryOnePageWithGsiByPk<TKeyItem, TGSIPKSource>(
    keyEntity: Entity<TKeyItem, unknown, unknown>,
    pkSource: TGSIPKSource,
    options?: AdvancedGsiQueryOnePageOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryAllWithGsiByPkAndSk<TKeyItem, TGSIPKSource>(
    keyEntity: Entity<TKeyItem, unknown, unknown>,
    pkSource: TGSIPKSource,
    queryRange: SkQueryRange,
    options?: AdvancedGsiQueryAllOptions
  ): Promise<MultipleEntityCollectionResponse>

  queryOnePageWithGsiByPkAndSk<TKeyItem, TGSIPKSource>(
    keyEntity: Entity<TKeyItem, unknown, unknown>,
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
