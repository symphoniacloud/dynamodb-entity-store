import { Entity } from './entities'
import { MultipleEntityOperations } from './multipleEntityOperations'
import { SingleEntityOperations } from './singleEntityOperations'
import { TransactionOperations } from './transactionOperations'

export interface AllEntitiesStore {
  for<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
    entity: Entity<TItem, TPKSource, TSKSource>
  ): SingleEntityOperations<TItem, TPKSource, TSKSource>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forMultiple(entities: Entity<any, any, any>[]): MultipleEntityOperations

  transactions: TransactionOperations
}
