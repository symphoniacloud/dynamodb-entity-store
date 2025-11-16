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

export const METADATA = { $metadata: {} }

const supportedParamKeysByFunction = {
  put: ['TableName', 'Item'],
  get: ['TableName', 'Key'],
  delete: ['TableName', 'Key'],
  batchWrite: ['RequestItems'],
  transactionWrite: ['TransactItems'],
  scanOnePage: ['TableName'],
  scanAllPages: ['TableName']
}

function checkSupportedParams(
  params: object,
  functionName: 'put' | 'get' | 'delete' | 'batchWrite' | 'transactionWrite' | 'scanOnePage' | 'scanAllPages'
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

// !! CAREFUL - this is not fully implemented!! !!
export class FakeDynamoDBInterface implements DynamoDBInterface {
  public readonly tables: Record<string, FakeTable> = {}

  constructor(tableDefs: Record<string, { pkName: string; skName?: string }>) {
    for (const [tableName, { pkName, skName }] of Object.entries(tableDefs)) {
      this.tables[tableName] = new FakeTable(pkName, skName)
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
    this.getTableFrom(params).putItem(params.Item)
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async queryOnePage(params: QueryCommandInput): Promise<QueryCommandOutput> {
    throw new Error('Not yet implemented')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async queryAllPages(params: QueryCommandInput): Promise<QueryCommandOutput[]> {
    throw new Error('Not yet implemented')
  }

  async scanOnePage(params: ScanCommandInput): Promise<ScanCommandOutput> {
    checkSupportedParams(params, 'scanOnePage')
    return {
      Items: this.getTableFrom(params).allItems(),
      ...METADATA
    }
  }

  async scanAllPages(params: ScanCommandInput): Promise<ScanCommandOutput[]> {
    checkSupportedParams(params, 'scanAllPages')
    return [
      {
        Items: this.getTableFrom(params).allItems(),
        ...METADATA
      }
    ]
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
  private readonly pkName: string
  private readonly skName: string | undefined
  private readonly items: Map<TableKey, Record<string, NativeAttributeValue>> = new Map<
    TableKey,
    Record<string, NativeAttributeValue>
  >()

  constructor(pkName: string, skName: string | undefined) {
    this.pkName = pkName
    this.skName = skName
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

  private keyFromItem(item: Record<string, NativeAttributeValue> | undefined): TableKey {
    if (!item) throw new Error('Item is undefined')
    const pkValue = item[this.pkName]
    if (!pkValue) throw new Error(`PK field [${this.pkName}] is not found`)
    if (this.skName) {
      const skValue = item[this.skName]
      if (!skValue) throw new Error(`SK field [${this.skName}] is not found`)
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
