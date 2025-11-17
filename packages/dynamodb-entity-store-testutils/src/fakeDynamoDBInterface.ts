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
import { evaluateConditionExpression } from './conditionExpressionEvaluator.js'
import { matchesKeyCondition, parseKeyConditionExpression } from './keyConditionExpressionEvaluator.js'

export const METADATA = { $metadata: {} }

const supportedParamKeysByFunction = {
  put: [
    'TableName',
    'Item',
    'ConditionExpression',
    'ExpressionAttributeNames',
    'ExpressionAttributeValues',
    'ReturnConsumedCapacity',
    'ReturnItemCollectionMetrics'
  ],
  get: ['TableName', 'Key', 'ConsistentRead', 'ReturnConsumedCapacity'],
  delete: ['TableName', 'Key', 'ConsistentRead', 'ReturnConsumedCapacity', 'ReturnItemCollectionMetrics'],
  batchWrite: ['RequestItems', 'ReturnConsumedCapacity', 'ReturnItemCollectionMetrics'],
  transactionWrite: [
    'TransactItems',
    'ReturnConsumedCapacity',
    'ReturnItemCollectionMetrics',
    'ClientRequestToken'
  ],
  queryOnePage: [
    'TableName',
    'KeyConditionExpression',
    'ExpressionAttributeNames',
    'ExpressionAttributeValues',
    'Limit',
    'ExclusiveStartKey',
    'ConsistentRead',
    'ReturnConsumedCapacity',
    'ScanIndexForward',
    'IndexName'
  ],
  queryAllPages: [
    'TableName',
    'KeyConditionExpression',
    'ExpressionAttributeNames',
    'ExpressionAttributeValues',
    'ConsistentRead',
    'ReturnConsumedCapacity',
    'ScanIndexForward',
    'IndexName'
  ],
  scanOnePage: ['TableName', 'ConsistentRead', 'ReturnConsumedCapacity'],
  scanAllPages: ['TableName', 'ConsistentRead', 'ReturnConsumedCapacity']
}

function checkSupportedParams(
  params: object,
  functionName:
    | 'put'
    | 'get'
    | 'delete'
    | 'batchWrite'
    | 'transactionWrite'
    | 'queryOnePage'
    | 'queryAllPages'
    | 'scanOnePage'
    | 'scanAllPages'
) {
  const unsupportedKeys = Object.keys(params).filter(
    (key) => !supportedParamKeysByFunction[functionName].includes(key)
  )

  if (unsupportedKeys.length > 0) {
    throw new Error(
      `FakeDynamoDBInterface.${functionName} does not support the following properties: ${unsupportedKeys.join(', ')}`
    )
  }
}

export interface KeyDefinition {
  pkName: string
  skName?: string
}

export interface TableDefinition extends KeyDefinition {
  gsis?: Record<string, KeyDefinition>
}

// !! CAREFUL - this is not fully implemented!! !!
export class FakeDynamoDBInterface implements DynamoDBInterface {
  public readonly tables: Record<string, FakeTable> = {}

  constructor(tableDefs: Record<string, TableDefinition>) {
    for (const [tableName, tableDef] of Object.entries(tableDefs)) {
      this.tables[tableName] = new FakeTable(tableDef)
    }

    // Needed because of Javascript 'this' behavior when using dynamic binding
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this#bound_methods_in_classes
    this.queryOnePage = this.queryOnePage.bind(this)
    this.queryAllPages = this.queryAllPages.bind(this)
    this.scanOnePage = this.scanOnePage.bind(this)
    this.scanAllPages = this.scanAllPages.bind(this)
  }

  async put(params: PutCommandInput) {
    checkSupportedParams(params, 'put')
    const table = this.getTableFrom(params)

    // Check condition expression if present
    if (params.ConditionExpression) {
      const existingItem = table.get(params.Item)
      evaluateConditionExpression(
        params.ConditionExpression,
        existingItem || {},
        params.ExpressionAttributeNames,
        params.ExpressionAttributeValues
      )
    }

    table.putItem(params.Item)
    return METADATA
  }

  async batchWrite(params: BatchWriteCommandInput): Promise<BatchWriteCommandOutput> {
    checkSupportedParams(params, 'batchWrite')
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async update(params: UpdateCommandInput): Promise<UpdateCommandOutput> {
    throw new Error('Not yet implemented')
  }

  async get(params: GetCommandInput): Promise<GetCommandOutput> {
    checkSupportedParams(params, 'get')
    return {
      Item: this.getTableFrom(params).get(params.Key),
      ...METADATA
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async batchGet(params: BatchGetCommandInput): Promise<BatchGetCommandOutput> {
    throw new Error('Not yet implemented')
  }

  async delete(params: DeleteCommandInput) {
    checkSupportedParams(params, 'delete')
    this.getTableFrom(params).deleteItem(params.Key)
    return METADATA
  }

  async transactionWrite(params: TransactWriteCommandInput): Promise<TransactWriteCommandOutput> {
    checkSupportedParams(params, 'transactionWrite')
    for (const item of params.TransactItems ?? []) {
      if (item.Put) {
        this.getTableFrom(item.Put).putItem(item.Put.Item)
      } else if (item.Delete) {
        this.getTableFrom(item.Delete).deleteItem(item.Delete.Key)
      } else {
        throw new Error('Operation not yet implemented')
      }
    }
    return METADATA
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transactionGet(params: TransactGetCommandInput): Promise<TransactGetCommandOutput> {
    throw new Error('Not yet implemented')
  }

  async queryOnePage(params: QueryCommandInput): Promise<QueryCommandOutput> {
    checkSupportedParams(params, 'queryOnePage')
    const items = this.executeQuery(params)

    // Apply limit if specified
    const limitedItems = params.Limit ? items.slice(0, params.Limit) : items

    return {
      Items: limitedItems,
      ...METADATA
    }
  }

  async queryAllPages(params: QueryCommandInput): Promise<QueryCommandOutput[]> {
    checkSupportedParams(params, 'queryAllPages')
    const items = this.executeQuery(params)

    return [
      {
        Items: items,
        ...METADATA
      }
    ]
  }

  private executeQuery(params: QueryCommandInput): Record<string, NativeAttributeValue>[] {
    if (!params.KeyConditionExpression) {
      throw new Error('KeyConditionExpression is required for query')
    }

    const table = this.getTableFrom(params)
    const keySchema = table.getKeySchema(params.IndexName)

    // Parse the key condition
    const keyCondition = parseKeyConditionExpression(
      params.KeyConditionExpression,
      params.ExpressionAttributeNames,
      params.ExpressionAttributeValues
    )

    let allItems = table.allItems()

    // For GSI queries, filter out items that don't have the GSI PK attribute (sparse index behavior)
    if (params.IndexName) {
      allItems = allItems.filter((item) => item[keySchema.pkName] !== undefined)
    }

    const filteredItems = allItems.filter((item) => matchesKeyCondition(item, keyCondition))

    // In DynamoDB, query results are always sorted by SK if it exists
    // ScanIndexForward defaults to true (ascending) if not specified
    const scanIndexForward = params.ScanIndexForward !== false
    const skAttributeName = keySchema.skName

    if (skAttributeName) {
      filteredItems.sort((a, b) => {
        const aValue = a[skAttributeName]
        const bValue = b[skAttributeName]

        const comparison = this.compareValues(aValue, bValue)
        return scanIndexForward ? comparison : -comparison
      })
    }

    return filteredItems
  }

  /**
   * Compare two DynamoDB attribute values for sorting.
   * Supports strings and numbers.
   */
  private compareValues(a: NativeAttributeValue, b: NativeAttributeValue): number {
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b)
    }
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b
    }
    // For other types, treat as equal
    return 0
  }

  async scanOnePage(params: ScanCommandInput): Promise<ScanCommandOutput> {
    checkSupportedParams(params, 'scanOnePage')
    return {
      Items: this.executeScan(params),
      ...METADATA
    }
  }

  async scanAllPages(params: ScanCommandInput): Promise<ScanCommandOutput[]> {
    checkSupportedParams(params, 'scanAllPages')
    return [
      {
        Items: this.executeScan(params),
        ...METADATA
      }
    ]
  }

  private executeScan(params: ScanCommandInput): Record<string, NativeAttributeValue>[] {
    return this.getTableFrom(params).allItems()
  }

  private getTableFrom(withTableName: { TableName: string | undefined }) {
    return this.getTable(withTableName.TableName)
  }

  private getTable(tableName: string | undefined) {
    if (!tableName) throw new Error('Table name is required')
    const table = this.tables[tableName]
    if (!table) throw new Error(`Table ${tableName} not configured`)
    return table
  }

  // Convenience functions
  public putToTable(tableName: string, item: Record<string, NativeAttributeValue>) {
    this.getTable(tableName).putItem(item)
  }

  public getFromTable(tableName: string, key: Record<string, NativeAttributeValue>) {
    return this.getTable(tableName).get(key)
  }

  public getAllFromTable(tableName: string) {
    return this.getTable(tableName).allItems()
  }
}

interface TableKey {
  PK: NativeAttributeValue
  SK?: NativeAttributeValue
}

class FakeTable {
  private readonly definition: TableDefinition
  private readonly items: Map<TableKey, Record<string, NativeAttributeValue>> = new Map<
    TableKey,
    Record<string, NativeAttributeValue>
  >()

  constructor(definition: TableDefinition) {
    this.definition = definition
  }

  putItem(item: Record<string, NativeAttributeValue> | undefined) {
    if (!item) return
    const itemKey = this.keyFromItem(item)
    // Required because complex key type on items, and otherwise we'd get "duplicate" items
    this.items.set(this.findMatchingKey(itemKey) ?? itemKey, item)
  }

  get(key: Record<string, NativeAttributeValue> | undefined) {
    const matchingKey = this.findMatchingKey(this.keyFromItem(key))
    return matchingKey ? this.items.get(matchingKey) : undefined
  }

  deleteItem(key: Record<string, NativeAttributeValue> | undefined) {
    const matchingKey = this.findMatchingKey(this.keyFromItem(key))
    if (matchingKey) {
      this.items.delete(matchingKey)
    }
  }

  allItems() {
    return Array.from(this.items.values())
  }

  getKeySchema(indexName?: string): { pkName: string; skName?: string } {
    if (indexName) {
      const gsiDefinition = (this.definition.gsis ?? {})[indexName]
      if (!gsiDefinition) throw new Error(`GSI ${indexName} not configured`)
      return gsiDefinition
    }
    return this.definition
  }

  private keyFromItem(item: Record<string, NativeAttributeValue> | undefined): TableKey {
    const { pkName, skName } = this.definition

    if (!item) throw new Error('Item is undefined')
    const pkValue = item[pkName]
    if (!pkValue) throw new Error(`PK field [${pkName}] is not found`)
    if (skName) {
      const skValue = item[skName]
      if (!skValue) throw new Error(`SK field [${skName}] is not found`)
      return { PK: pkValue, SK: skValue }
    } else {
      return { PK: pkValue }
    }
  }

  // Required because we have a complex key on items (a Map), and Map only matches object
  // complex keys if they are the same instance
  private findMatchingKey(key: TableKey) {
    for (const tableKey of this.items.keys()) {
      if (tableKey.PK === key.PK && tableKey.SK === key.SK) return tableKey
    }
    return undefined
  }
}
