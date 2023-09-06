import { Entity } from './entities'
import { MultipleEntityOperations } from './multipleEntityOperations'
import { SingleEntityOperations } from './singleEntityOperations'
import { TransactionOperations } from './transactionOperations'

/**
 * Top-level interface for all operations in dynamodb-entity-store.
 * Typically use the `for(entity)` method, but use the other methods here for more advanced usage
 */
export interface AllEntitiesStore {
  /**
   * Build an object to work with one specific Entity. To work with multiple entities in one operation
   * use one of the other methods on this type. But to perform multiple operations that each use
   * an individual entity type then just call this for each entity type.
   * This method is fairly cheap, so feel free to either call it for every operation, or call it and
   * cache it - it's up to you and your style
   * @param entity
   */
  for<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
    entity: Entity<TItem, TPKSource, TSKSource>
  ): SingleEntityOperations<TItem, TPKSource, TSKSource>

  /**
   * Build an object to work with multiple entities in one (non-transactional) operation.
   * This can be useful, for example, if you want to use
   * one query to return multiple entities that each share a common partition key.
   * @param entities
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forMultiple(entities: Entity<any, any, any>[]): MultipleEntityOperations

  /**
   * An object to wrap all transactional operations
   */
  transactions: TransactionOperations
}
