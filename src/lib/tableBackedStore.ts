import { AllEntitiesStore } from './entityStore'
import { Entity } from './entities'
import { TablesConfig, StoreContext } from './tableBackedStoreConfiguration'
import { tableBackedSingleEntityOperations } from './internal/singleEntity/tableBackedSingleEntityOperations'
import { resolverFor } from './internal/tableBackedConfigurationResolver'
import { TableBackedWriteTransactionBuilder } from './internal/transactions/tableBackedWriteTransactionBuilder'
import { MultipleEntityOperations } from './multipleEntityOperations'
import { tableBackedMultipleEntityOperations } from './internal/multipleEntities/tableBackedMultipleEntityOperations'
import { SingleEntityOperations } from './singleEntityOperations'
import { TableBackedGetTransactionBuilder } from './internal/transactions/tableBackedGetTransactionBuilder'
import { GetTransactionBuilder, WriteTransactionBuilder } from './transactionOperations'
import { createStoreContext } from './support'

/**
 * Entry point to dynamodb-entity-store. A Table Backed Store can use either one DynamoDB backing table,
 * or several; and can be used to persist one entity type, or several.
 * @param tablesConfig - either using objects created from setupSupport.ts, (e.g. `createStandardSingleTableConfig`) or you can fully customize
 * @param context - override the default store context. To see what those defaults are, see `createStoreContext` in setupSupport.ts
 */
export function createStore(tablesConfig: TablesConfig, context?: StoreContext): AllEntitiesStore {
  const tableConfigResolver = resolverFor(context ?? createStoreContext(), tablesConfig)
  return {
    for<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
      entity: Entity<TItem, TPKSource, TSKSource>
    ): SingleEntityOperations<TItem, TPKSource, TSKSource> {
      return tableBackedSingleEntityOperations(tableConfigResolver, entity)
    },
    forMultiple(entities: Entity<unknown, unknown, unknown>[]): MultipleEntityOperations {
      return tableBackedMultipleEntityOperations(tableConfigResolver, entities)
    },
    transactions: {
      buildWriteTransaction<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
        firstEntity: Entity<TItem, TPKSource, TSKSource>
      ): WriteTransactionBuilder<TItem, TPKSource, TSKSource> {
        return new TableBackedWriteTransactionBuilder(tableConfigResolver, firstEntity)
      },
      buildGetTransaction<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
        firstEntity: Entity<TItem, TPKSource, TSKSource>
      ): GetTransactionBuilder<TItem, TPKSource, TSKSource> {
        return new TableBackedGetTransactionBuilder(tableConfigResolver, firstEntity)
      }
    }
  }
}
