import { AllEntitiesStore } from './entityStore'
import { Entity } from './entities'
import { TableBackedStoreConfiguration } from './tableBackedStoreConfiguration'
import { tableBackedSingleEntityOperations } from './internal/singleEntity/tableBackedSingleEntityOperations'
import { resolverFor } from './internal/tableBackedConfigurationResolver'
import { TableBackedWriteTransactionBuilder } from './internal/transactions/tableBackedWriteTransactionBuilder'
import { MultipleEntityOperations } from './multipleEntityOperations'
import { tableBackedMultipleEntityOperations } from './internal/multipleEntities/tableBackedMultipleEntityOperations'
import { SingleEntityOperations } from './singleEntityOperations'
import { TableBackedGetTransactionBuilder } from './internal/transactions/tableBackedGetTransactionBuilder'
import { GetTransactionBuilder, WriteTransactionBuilder } from './transactionOperations'

/**
 * Entry point to dynamodb-entity-store. A Table Backed Store can use either one DynamoDB backing table,
 * or several; and can be used to persist one entity type, or several.
 * @param config - either using objects created from configSupport.ts, (e.g. `createStandardSingleTableStoreConfig`) or you can fully customize
 */
export function createStore(config: TableBackedStoreConfiguration): AllEntitiesStore {
  const tableConfigResolver = resolverFor(config)
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
