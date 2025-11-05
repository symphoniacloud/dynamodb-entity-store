import { Entity } from '../../entities.js'
import { EntityContextParams, createEntityContext, EntityContext } from '../entityContext.js'
import {
  DeleteCommandInput,
  PutCommandInput,
  TransactWriteCommandInput,
  UpdateCommandInput
} from '@aws-sdk/lib-dynamodb'
import { isDebugLoggingEnabled } from '../../util/logger.js'
import { Mandatory } from '../../util/types.js'
import { ConditionCheckParams, createTransactionConditionCheck } from './conditionCheckOperation.js'
import { returnConsumedCapacityParam, returnItemCollectionMetricsParam } from '../common/operationsCommon.js'
import {
  TransactionConditionCheckOptions,
  TransactionDeleteOptions,
  TransactionPutOptions,
  TransactionUpdateOptions,
  WriteTransactionBuilder,
  WriteTransactionOptions,
  WriteTransactionResponse
} from '../../transactionOperations.js'
import { putParams } from '../common/putCommon.js'
import { deleteParams } from '../common/deleteCommon.js'
import { createUpdateParams } from '../common/updateCommon.js'

type WriteTransactionAction =
  | {
      Put: PutCommandInput
    }
  | {
      Delete: DeleteCommandInput
    }
  | {
      Update: Mandatory<UpdateCommandInput, 'UpdateExpression'>
    }
  | {
      ConditionCheck: ConditionCheckParams
    }

export class TableBackedWriteTransactionBuilder<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>
  implements WriteTransactionBuilder<TItem, TPKSource, TSKSource>
{
  private readonly actions: WriteTransactionAction[]
  private readonly tableConfigResolver: (entityType: string) => EntityContextParams
  private readonly context: EntityContext<TItem, TPKSource, TSKSource>

  constructor(
    tableConfigResolver: (entityType: string) => EntityContextParams,
    currentEntity: Entity<TItem, TPKSource, TSKSource>,
    actions?: WriteTransactionAction[]
  ) {
    this.tableConfigResolver = tableConfigResolver
    this.actions = actions ?? []
    this.context = createEntityContext(tableConfigResolver(currentEntity.type), currentEntity)
  }

  nextEntity<TNextItem extends TNextPKSource & TNextSKSource, TNextPKSource, TNextSKSource>(
    nextEntity: Entity<TNextItem, TNextPKSource, TNextSKSource>
  ): WriteTransactionBuilder<TNextItem, TNextPKSource, TNextSKSource> {
    return new TableBackedWriteTransactionBuilder(this.tableConfigResolver, nextEntity, this.actions)
  }

  put(item: TItem, options?: TransactionPutOptions): WriteTransactionBuilder<TItem, TPKSource, TSKSource> {
    this.actions.push({ Put: putParams(this.context, item, options) })
    return this
  }

  update<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options: TransactionUpdateOptions
  ): WriteTransactionBuilder<TItem, TPKSource, TSKSource> {
    this.actions.push({ Update: createUpdateParams(this.context, keySource, options) })
    return this
  }

  delete<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options?: TransactionDeleteOptions
  ): WriteTransactionBuilder<TItem, TPKSource, TSKSource> {
    this.actions.push({ Delete: deleteParams(this.context, keySource, options) })
    return this
  }

  conditionCheck<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource,
    options: TransactionConditionCheckOptions
  ): WriteTransactionBuilder<TItem, TPKSource, TSKSource> {
    this.actions.push({
      ConditionCheck: createTransactionConditionCheck(this.context, keySource, options)
    })
    return this
  }

  async execute(options?: WriteTransactionOptions): Promise<WriteTransactionResponse> {
    const transactionParams: TransactWriteCommandInput = {
      TransactItems: this.actions,
      ...returnConsumedCapacityParam(options),
      ...returnItemCollectionMetricsParam(options),
      ...(options?.clientRequestToken ? { ClientRequestToken: options.clientRequestToken } : {})
    }
    if (isDebugLoggingEnabled(this.context.logger)) {
      this.context.logger.debug(`Attempting write transaction`, { transactionParams })
    }
    const result = await this.context.dynamoDB.transactionWrite(transactionParams)
    if (isDebugLoggingEnabled(this.context.logger)) {
      this.context.logger.debug(`Write transaction result`, { result })
    }
    return result.ConsumedCapacity || result.ItemCollectionMetrics
      ? {
          metadata: {
            ...(result.ConsumedCapacity ? { consumedCapacity: result.ConsumedCapacity } : {}),
            ...(result.ItemCollectionMetrics ? { itemCollectionMetrics: result.ItemCollectionMetrics } : {})
          }
        }
      : {}
  }
}
