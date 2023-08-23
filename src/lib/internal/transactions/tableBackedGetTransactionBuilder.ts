import { DynamoDBValues, Entity } from '../../entities'
import { CompleteTableParams, createEntityContext, EntityContext } from '../entityContext'
import {
  keyParamFromSource,
  parseItem,
  returnConsumedCapacityParam,
  tableNameParam
} from '../operationsCommon'
import { TransactGetCommandInput, TransactGetCommandOutput } from '@aws-sdk/lib-dynamodb'
import { isDebugLoggingEnabled } from '../../util/logger'

import {
  GetTransactionBuilder,
  GetTransactionOptions,
  GetTransactionResponse
} from '../../transactionOperations'

interface GetTransactionItem {
  Get: {
    Key: DynamoDBValues
    TableName: string
  }
  // Projection Expression fields to come later, maybe
}

export class TableBackedGetTransactionBuilder<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>
  implements GetTransactionBuilder<TItem, TPKSource, TSKSource>
{
  private readonly requests: GetTransactionItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly contextsPerRequest: EntityContext<any, any, any>[]
  private readonly tableConfigResolver: (entityType: string) => CompleteTableParams
  private readonly context: EntityContext<TItem, TPKSource, TSKSource>

  constructor(
    tableConfigResolver: (entityType: string) => CompleteTableParams,
    currentEntity: Entity<TItem, TPKSource, TSKSource>,
    {
      contexts,
      requests
    }: { contexts: EntityContext<unknown, unknown, unknown>[]; requests: GetTransactionItem[] } = {
      contexts: [],
      requests: []
    }
  ) {
    this.tableConfigResolver = tableConfigResolver
    this.requests = requests
    this.contextsPerRequest = contexts
    this.context = createEntityContext(tableConfigResolver(currentEntity.type), currentEntity)
  }

  get<TKeySource extends TPKSource & TSKSource>(
    keySource: TKeySource
  ): GetTransactionBuilder<TItem, TPKSource, TSKSource> {
    this.requests.push({
      Get: {
        ...tableNameParam(this.context),
        ...keyParamFromSource(this.context, keySource)
      }
    })
    this.contextsPerRequest.push(this.context)
    return this
  }

  nextEntity<TNextItem extends TNextPKSource & TNextSKSource, TNextPKSource, TNextSKSource>(
    nextEntity: Entity<TNextItem, TNextPKSource, TNextSKSource>
  ): GetTransactionBuilder<TNextItem, TNextPKSource, TNextSKSource> {
    return new TableBackedGetTransactionBuilder(this.tableConfigResolver, nextEntity, {
      contexts: this.contextsPerRequest,
      requests: this.requests
    })
  }

  async execute(options?: GetTransactionOptions): Promise<GetTransactionResponse> {
    const transactionParams: TransactGetCommandInput = {
      TransactItems: this.requests,
      ...returnConsumedCapacityParam(options)
    }

    if (isDebugLoggingEnabled(this.context.logger)) {
      this.context.logger.debug(`Attempting get transaction`, { transactionParams })
    }
    const result = await this.context.dynamoDB.transactionGet(transactionParams)
    if (isDebugLoggingEnabled(this.context.logger)) {
      this.context.logger.debug(`Get transaction result`, { result })
    }

    return parseResponse(this.contextsPerRequest, result)
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
    metadata: {
      ...(result.ConsumedCapacity ? { consumedCapacity: result.ConsumedCapacity } : {})
    }
  }
}
