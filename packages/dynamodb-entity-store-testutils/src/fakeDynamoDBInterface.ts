import {
  BatchGetCommandInput,
  BatchGetCommandOutput,
  BatchWriteCommandInput,
  BatchWriteCommandOutput,
  DeleteCommandInput,
  GetCommandInput,
  GetCommandOutput,
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

export const METADATA = { $metadata: {} }

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
    this.getTableFrom(params).putItem(params.Item)
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async update(params: UpdateCommandInput): Promise<UpdateCommandOutput> {
    throw new Error('Not yet implemented')
  }

  async get(params: GetCommandInput): Promise<GetCommandOutput> {
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
    this.getTableFrom(params).deleteItem(params.Key)
    return METADATA
  }

  async transactionWrite(params: TransactWriteCommandInput): Promise<TransactWriteCommandOutput> {
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
    return {
      Items: this.getTableFrom(params).allItems(),
      ...METADATA
    }
  }

  async scanAllPages(params: ScanCommandInput): Promise<ScanCommandOutput[]> {
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

  public getTable(tableName: string | undefined) {
    if (!tableName) throw new Error('Table name is required')
    const table = this.tables[tableName]
    if (!table) throw new Error(`Table ${tableName} not configured`)
    return table
  }
}
