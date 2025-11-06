import {
  BatchGetCommandInput,
  BatchGetCommandOutput,
  BatchWriteCommandInput,
  BatchWriteCommandOutput,
  DeleteCommandInput,
  GetCommandInput,
  GetCommandOutput,
  NativeAttributeValue,
  PutCommandInput,
  QueryCommandInput,
  QueryCommandOutput,
  ScanCommandInput,
  ScanCommandOutput,
  TransactGetCommandInput,
  TransactGetCommandOutput,
  TransactWriteCommandInput,
  TransactWriteCommandOutput,
  UpdateCommandInput,
  UpdateCommandOutput
} from '@aws-sdk/lib-dynamodb'
import { DynamoDBInterface } from '@symphoniacloud/dynamodb-entity-store'
import { FakeTable } from './fakeDynamoDBTable.js'
import {
  applyUpdateExpression,
  applyProjectionExpression,
  evaluateConditionExpression
} from './expressionEvaluator.js'

export const METADATA = { $metadata: {} }

export class ConditionalCheckFailedException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConditionalCheckFailedException'
  }
}

export class FakeDynamoDBInterface implements DynamoDBInterface {
  public readonly tables: Record<string, FakeTable> = {}

  constructor(tableDefs: Record<string, { pkName: string; skName?: string }>) {
    for (const [tableName, { pkName, skName }] of Object.entries(tableDefs)) {
      this.tables[tableName] = new FakeTable(pkName, skName)
    }

    // Needed because of Javascript and weird 'this' behavior when using dynamic binding
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this#bound_methods_in_classes
    this.queryOnePage = this.queryOnePage.bind(this)
    this.queryAllPages = this.queryAllPages.bind(this)
    this.scanOnePage = this.scanOnePage.bind(this)
    this.scanAllPages = this.scanAllPages.bind(this)
  }

  async put(params: PutCommandInput) {
    const table = this.getTableFrom(params)

    // Check condition expression if provided
    if (params.ConditionExpression) {
      const existingItem = table.get(params.Item)
      if (existingItem) {
        const conditionMet = evaluateConditionExpression(params.ConditionExpression, {
          item: existingItem,
          expressionAttributeValues: params.ExpressionAttributeValues,
          expressionAttributeNames: params.ExpressionAttributeNames
        })

        if (!conditionMet) {
          throw new ConditionalCheckFailedException('The conditional request failed')
        }
      } else if (params.ConditionExpression.includes('attribute_exists')) {
        // Item doesn't exist but condition requires it to exist
        throw new ConditionalCheckFailedException('The conditional request failed')
      }
    }

    const oldItem = table.get(params.Item)
    table.putItem(params.Item)

    // Handle ReturnValues
    if (params.ReturnValues === 'ALL_OLD') {
      return { Attributes: oldItem, ...METADATA }
    }

    return METADATA
  }

  async batchWrite(params: BatchWriteCommandInput): Promise<BatchWriteCommandOutput> {
    if (!params.RequestItems) throw new Error('RequestItems is required')

    for (const [tableName, requests] of Object.entries(params.RequestItems)) {
      const table = this.getTable(tableName)
      for (const rq of requests) {
        if (rq.PutRequest) {
          table.putItem(rq.PutRequest.Item)
        }
        if (rq.DeleteRequest) {
          table.deleteItem(rq.DeleteRequest.Key)
        }
      }
    }
    return METADATA
  }

  async update(params: UpdateCommandInput): Promise<UpdateCommandOutput> {
    if (!params.Key) throw new Error('Key is required')

    const table = this.getTableFrom(params)
    const existingItem = table.get(params.Key)

    // Check condition expression if provided
    if (params.ConditionExpression && existingItem) {
      const conditionMet = evaluateConditionExpression(params.ConditionExpression, {
        item: existingItem,
        expressionAttributeValues: params.ExpressionAttributeValues,
        expressionAttributeNames: params.ExpressionAttributeNames
      })

      if (!conditionMet) {
        throw new ConditionalCheckFailedException('The conditional request failed')
      }
    }

    if (!existingItem) {
      // If item doesn't exist, create it with the key
      const newItem = { ...params.Key }
      const updatedItem = applyUpdateExpression(
        newItem,
        params.UpdateExpression,
        params.ExpressionAttributeValues,
        params.ExpressionAttributeNames
      )
      table.putItem(updatedItem)

      if (params.ReturnValues === 'ALL_NEW' || params.ReturnValues === 'UPDATED_NEW') {
        return { Attributes: updatedItem, ...METADATA }
      }
      return METADATA
    }

    // Copy for old values if needed
    const oldItem = params.ReturnValues === 'ALL_OLD' || params.ReturnValues === 'UPDATED_OLD'
      ? { ...existingItem }
      : undefined

    // Apply update expression
    const updatedItem = applyUpdateExpression(
      existingItem,
      params.UpdateExpression,
      params.ExpressionAttributeValues,
      params.ExpressionAttributeNames
    )

    table.putItem(updatedItem)

    // Handle ReturnValues
    if (params.ReturnValues === 'ALL_OLD') {
      return { Attributes: oldItem, ...METADATA }
    }
    if (params.ReturnValues === 'ALL_NEW') {
      return { Attributes: updatedItem, ...METADATA }
    }
    if (params.ReturnValues === 'UPDATED_OLD') {
      return { Attributes: oldItem, ...METADATA }
    }
    if (params.ReturnValues === 'UPDATED_NEW') {
      return { Attributes: updatedItem, ...METADATA }
    }

    return METADATA
  }

  async get(params: GetCommandInput): Promise<GetCommandOutput> {
    let item = this.getTableFrom(params).get(params.Key)

    // Apply projection expression if provided
    if (params.ProjectionExpression) {
      item = applyProjectionExpression(
        item,
        params.ProjectionExpression,
        params.ExpressionAttributeNames
      )
    }

    return {
      Item: item,
      ...METADATA
    }
  }

  async batchGet(params: BatchGetCommandInput): Promise<BatchGetCommandOutput> {
    if (!params.RequestItems) throw new Error('RequestItems is required')

    const responses: Record<string, Record<string, NativeAttributeValue>[]> = {}

    for (const [tableName, tableRequest] of Object.entries(params.RequestItems)) {
      const table = this.getTable(tableName)
      const items: Record<string, NativeAttributeValue>[] = []

      for (const key of tableRequest.Keys || []) {
        let item = table.get(key)
        if (item) {
          // Apply projection expression if provided
          if (tableRequest.ProjectionExpression) {
            item = applyProjectionExpression(
              item,
              tableRequest.ProjectionExpression,
              tableRequest.ExpressionAttributeNames
            )
          }
          if (item) {
            items.push(item)
          }
        }
      }

      if (items.length > 0) {
        responses[tableName] = items
      }
    }

    return {
      Responses: responses,
      ...METADATA
    }
  }

  async delete(params: DeleteCommandInput) {
    const table = this.getTableFrom(params)

    // Check condition expression if provided
    if (params.ConditionExpression) {
      const existingItem = table.get(params.Key)
      if (existingItem) {
        const conditionMet = evaluateConditionExpression(params.ConditionExpression, {
          item: existingItem,
          expressionAttributeValues: params.ExpressionAttributeValues,
          expressionAttributeNames: params.ExpressionAttributeNames
        })

        if (!conditionMet) {
          throw new ConditionalCheckFailedException('The conditional request failed')
        }
      }
    }

    const oldItem = table.get(params.Key)
    table.deleteItem(params.Key)

    // Handle ReturnValues
    if (params.ReturnValues === 'ALL_OLD') {
      return { Attributes: oldItem, ...METADATA }
    }

    return METADATA
  }

  async transactionWrite(params: TransactWriteCommandInput): Promise<TransactWriteCommandOutput> {
    if (!params.TransactItems) throw new Error('TransactItems is required')

    // Capture state before transaction for rollback
    const snapshots: Array<{
      table: FakeTable
      key: Record<string, NativeAttributeValue>
      oldItem: Record<string, NativeAttributeValue> | undefined
    }> = []

    try {
      // Execute all operations, checking conditions first
      for (const transactItem of params.TransactItems) {
        if (transactItem.Put) {
          const table = this.getTableFrom(transactItem.Put)
          if (!transactItem.Put.Item) throw new Error('Put Item is required in transaction')

          const oldItem = table.get(transactItem.Put.Item)

          // Check condition if provided
          if (transactItem.Put.ConditionExpression) {
            if (oldItem) {
              const conditionMet = evaluateConditionExpression(transactItem.Put.ConditionExpression, {
                item: oldItem,
                expressionAttributeValues: transactItem.Put.ExpressionAttributeValues,
                expressionAttributeNames: transactItem.Put.ExpressionAttributeNames
              })

              if (!conditionMet) {
                throw new ConditionalCheckFailedException('Transaction cancelled due to conditional check failure')
              }
            } else if (transactItem.Put.ConditionExpression.includes('attribute_exists')) {
              throw new ConditionalCheckFailedException('Transaction cancelled due to conditional check failure')
            }
          }

          snapshots.push({ table, key: transactItem.Put.Item, oldItem })
          table.putItem(transactItem.Put.Item)

        } else if (transactItem.Delete) {
          const table = this.getTableFrom(transactItem.Delete)
          if (!transactItem.Delete.Key) throw new Error('Delete Key is required in transaction')

          const oldItem = table.get(transactItem.Delete.Key)

          // Check condition if provided
          if (transactItem.Delete.ConditionExpression && oldItem) {
            const conditionMet = evaluateConditionExpression(transactItem.Delete.ConditionExpression, {
              item: oldItem,
              expressionAttributeValues: transactItem.Delete.ExpressionAttributeValues,
              expressionAttributeNames: transactItem.Delete.ExpressionAttributeNames
            })

            if (!conditionMet) {
              throw new ConditionalCheckFailedException('Transaction cancelled due to conditional check failure')
            }
          }

          snapshots.push({ table, key: transactItem.Delete.Key, oldItem })
          table.deleteItem(transactItem.Delete.Key)

        } else if (transactItem.Update) {
          const table = this.getTableFrom(transactItem.Update)
          if (!transactItem.Update.Key) throw new Error('Update Key is required in transaction')

          const oldItem = table.get(transactItem.Update.Key)

          // Check condition if provided
          if (transactItem.Update.ConditionExpression && oldItem) {
            const conditionMet = evaluateConditionExpression(transactItem.Update.ConditionExpression, {
              item: oldItem,
              expressionAttributeValues: transactItem.Update.ExpressionAttributeValues,
              expressionAttributeNames: transactItem.Update.ExpressionAttributeNames
            })

            if (!conditionMet) {
              throw new ConditionalCheckFailedException('Transaction cancelled due to conditional check failure')
            }
          }

          const itemToUpdate = oldItem ? { ...oldItem } : { ...transactItem.Update.Key }
          const updatedItem = applyUpdateExpression(
            itemToUpdate,
            transactItem.Update.UpdateExpression,
            transactItem.Update.ExpressionAttributeValues,
            transactItem.Update.ExpressionAttributeNames
          )

          snapshots.push({ table, key: transactItem.Update.Key, oldItem })
          table.putItem(updatedItem)

        } else {
          throw new Error('Unsupported transaction operation')
        }
      }

      return METADATA
    } catch (error) {
      // Rollback all changes
      for (const snapshot of snapshots) {
        if (snapshot.oldItem) {
          snapshot.table.putItem(snapshot.oldItem)
        } else {
          snapshot.table.deleteItem(snapshot.key)
        }
      }
      throw error
    }
  }

  async transactionGet(params: TransactGetCommandInput): Promise<TransactGetCommandOutput> {
    if (!params.TransactItems) throw new Error('TransactItems is required')

    const responses: { Item?: Record<string, NativeAttributeValue> }[] = []

    for (const transactItem of params.TransactItems) {
      if (!transactItem.Get) throw new Error('Only Get operations supported in transactionGet')

      const table = this.getTableFrom(transactItem.Get)
      let item = table.get(transactItem.Get.Key)

      // Apply projection expression if provided
      if (transactItem.Get.ProjectionExpression) {
        item = applyProjectionExpression(
          item,
          transactItem.Get.ProjectionExpression,
          transactItem.Get.ExpressionAttributeNames
        )
      }

      responses.push({ Item: item })
    }

    return {
      Responses: responses,
      ...METADATA
    }
  }

  async queryOnePage(params: QueryCommandInput): Promise<QueryCommandOutput> {
    const allResults = await this.queryAllPages(params)
    if (allResults.length === 0) {
      return { Items: [], ...METADATA }
    }

    const firstPage = allResults[0]
    let items = firstPage.Items || []

    // Apply limit if specified
    if (params.Limit && items.length > params.Limit) {
      items = items.slice(0, params.Limit)
      // In a real implementation, would return LastEvaluatedKey here
    }

    return {
      Items: items,
      ...METADATA
    }
  }

  async queryAllPages(params: QueryCommandInput): Promise<QueryCommandOutput[]> {
    const table = this.getTableFrom(params)
    const attrValues = params.ExpressionAttributeValues
    if (!attrValues) {
      throw new Error('ExpressionAttributeValues required for query (must include partition key value)')
    }

    // Extract partition key value - try common names, fall back to first value
    const pkValue = attrValues[':pk'] ?? attrValues[':partitionKey'] ?? Object.values(attrValues)[0]

    // Extract sort key value if present
    const skValue = attrValues[':sk'] ?? attrValues[':sortKey']

    let items = table.query(pkValue, skValue)

    // Apply filter expression if provided
    if (params.FilterExpression) {
      items = items.filter((item) =>
        evaluateConditionExpression(params.FilterExpression, {
          item,
          expressionAttributeValues: params.ExpressionAttributeValues,
          expressionAttributeNames: params.ExpressionAttributeNames
        })
      )
    }

    // Apply projection expression if provided
    if (params.ProjectionExpression) {
      items = items.map((item) =>
        applyProjectionExpression(
          item,
          params.ProjectionExpression,
          params.ExpressionAttributeNames
        )
      ).filter((item): item is Record<string, NativeAttributeValue> => item !== undefined)
    }

    return [
      {
        Items: items,
        ...METADATA
      }
    ]
  }

  async scanOnePage(params: ScanCommandInput): Promise<ScanCommandOutput> {
    let items = this.getTableFrom(params).allItems()

    // Apply filter expression if provided
    if (params.FilterExpression) {
      items = items.filter((item) =>
        evaluateConditionExpression(params.FilterExpression, {
          item,
          expressionAttributeValues: params.ExpressionAttributeValues,
          expressionAttributeNames: params.ExpressionAttributeNames
        })
      )
    }

    // Apply projection expression if provided
    if (params.ProjectionExpression) {
      items = items.map((item) =>
        applyProjectionExpression(
          item,
          params.ProjectionExpression,
          params.ExpressionAttributeNames
        )
      ).filter((item): item is Record<string, NativeAttributeValue> => item !== undefined)
    }

    // Apply limit if specified
    if (params.Limit && items.length > params.Limit) {
      items = items.slice(0, params.Limit)
    }

    return {
      Items: items,
      ...METADATA
    }
  }

  async scanAllPages(params: ScanCommandInput): Promise<ScanCommandOutput[]> {
    let items = this.getTableFrom(params).allItems()

    // Apply filter expression if provided
    if (params.FilterExpression) {
      items = items.filter((item) =>
        evaluateConditionExpression(params.FilterExpression, {
          item,
          expressionAttributeValues: params.ExpressionAttributeValues,
          expressionAttributeNames: params.ExpressionAttributeNames
        })
      )
    }

    // Apply projection expression if provided
    if (params.ProjectionExpression) {
      items = items.map((item) =>
        applyProjectionExpression(
          item,
          params.ProjectionExpression,
          params.ExpressionAttributeNames
        )
      ).filter((item): item is Record<string, NativeAttributeValue> => item !== undefined)
    }

    return [
      {
        Items: items,
        ...METADATA
      }
    ]
  }

  public getTableFrom(withTableName: { TableName: string | undefined }) {
    return this.getTable(withTableName.TableName)
  }

  public getTable(tableName: string | undefined) {
    if (!tableName) throw new Error('Table name is required')
    const table = this.tables[tableName]
    if (!table) throw new Error(`Table ${tableName} not configured`)
    return table
  }
}
