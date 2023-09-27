import { DynamoDBValues, Entity } from '../../entities'
import { EntityContextParams, createEntityContext, EntityContext } from '../entityContext'
import {
  keyParamFromSource,
  parseItem,
  returnConsumedCapacityParam,
  tableNameParam
} from '../common/operationsCommon'
import { TransactGetCommandInput, TransactGetCommandOutput } from '@aws-sdk/lib-dynamodb'
import { isDebugLoggingEnabled } from '../../util/logger'

import {
  GetTransactionBuilder,
  GetTransactionOptions,
  GetTransactionResponse
} from '../../transactionOperations'

interface GetTransactionAction {
  Get: {
    Key: DynamoDBValues
    TableName: string
  }
  // Projection Expression fields to come later, maybe
}

export class TableBackedGetTransactionBuilder<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>
  implements GetTransactionBuilder<TItem, TPKSource, TSKSource>
{
  private readonly actions: GetTransactionAction[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly contextsPerAction: EntityContext<any, any, any>[]
  private readonly tableConfigResolver: (entityType: string) => EntityContextParams
  private readonly context: EntityContext<TItem, TPKSource, TSKSource>

  constructor(
    tableConfigResolver: (entityType: string) => EntityContextParams,
    currentEntity: Entity<TItem, TPKSource, TSKSource>,
    {
      contexts,
      actions
    }: { contexts: EntityContext<unknown, unknown, unknown>[]; actions: GetTransactionAction[] } = {
      contexts: [],
      actions: []
    }
  ) {
    this.tableConfigResolver = tableConfigResolver
    this.actions = actions
    this.contextsPerAction = contexts
    this.context = createEntityContext(tableConfigResolver(currentEntity.type), currentEntity)
  }

  get<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource
  ): GetTransactionBuilder<TItem, TPKSource, TSKSource> {
    this.actions.push({
      Get: {
        ...tableNameParam(this.context),
        ...keyParamFromSource(this.context, keySource)
      }
    })
    this.contextsPerAction.push(this.context)
    return this
  }

  nextEntity<TNextItem extends TNextPKSource & TNextSKSource, TNextPKSource, TNextSKSource>(
    nextEntity: Entity<TNextItem, TNextPKSource, TNextSKSource>
  ): GetTransactionBuilder<TNextItem, TNextPKSource, TNextSKSource> {
    return new TableBackedGetTransactionBuilder(this.tableConfigResolver, nextEntity, {
      contexts: this.contextsPerAction,
      actions: this.actions
    })
  }

  async execute(options?: GetTransactionOptions): Promise<GetTransactionResponse> {
    const transactionParams: TransactGetCommandInput = {
      TransactItems: this.actions,
      ...returnConsumedCapacityParam(options)
    }

    if (isDebugLoggingEnabled(this.context.logger)) {
      this.context.logger.debug(`Attempting get transaction`, { transactionParams })
    }
    const result = await this.context.dynamoDB.transactionGet(transactionParams)
    if (isDebugLoggingEnabled(this.context.logger)) {
      this.context.logger.debug(`Get transaction result`, { result })
    }

    return parseResponse(this.contextsPerAction, result)
  }
}

export function parseResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contexts: EntityContext<any, any, any>[],
  result: TransactGetCommandOutput
): GetTransactionResponse {
  const parsedWithElementType = Array.from(result.Responses ?? [], (response, i) => {
    return [response.Item ? parseItem(contexts[i], response.Item) : null, contexts[i].entity.type]
  })

  const itemsByEntityType = parsedWithElementType.reduce((accum: Record<string, unknown[]>, [item, et]) => {
    if (!accum[et]) accum[et] = []
    accum[et].push(item)
    return accum
  }, {})

  return {
    itemsByEntityType,
    ...(result.ConsumedCapacity ? { metadata: { consumedCapacity: result.ConsumedCapacity } } : {})
  }
}
