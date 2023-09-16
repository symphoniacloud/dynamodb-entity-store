import {
  BatchGetCommandInput,
  BatchGetCommandOutput,
  BatchWriteCommandInput,
  BatchWriteCommandOutput,
  DeleteCommandInput,
  GetCommandInput,
  GetCommandOutput,
  PutCommandInput,
  PutCommandOutput,
  QueryCommandInput,
  QueryCommandOutput,
  ScanCommandInput,
  ScanCommandOutput,
  TransactGetCommandInput,
  TransactWriteCommandInput,
  UpdateCommandInput,
  UpdateCommandOutput
} from '@aws-sdk/lib-dynamodb'
import { DynamoDBInterface } from '../../../../src/lib/dynamoDBInterface'
import { arrayStubResponse } from './fakeSupport'

export const METADATA = { $metadata: {} }

export function fakeDynamoDBInterface() {
  return new FakeDynamoDBInterface()
}

export class FakeDynamoDBInterface implements DynamoDBInterface {
  public puts: PutCommandInput[] = []
  public batchWrites: BatchWriteCommandInput[] = []
  public updates: UpdateCommandInput[] = []
  public deletes: DeleteCommandInput[] = []
  public stubPuts = arrayStubResponse<PutCommandInput, PutCommandOutput>()
  public stubGets = arrayStubResponse<GetCommandInput, GetCommandOutput>()
  public stubBatchGets = arrayStubResponse<BatchGetCommandInput, BatchGetCommandOutput>()
  public stubOnePageQueries = arrayStubResponse<QueryCommandInput, QueryCommandOutput>()
  public stubAllPagesQueries = arrayStubResponse<QueryCommandInput, QueryCommandOutput[]>()
  public stubOnePageScans = arrayStubResponse<ScanCommandInput, ScanCommandOutput>()
  public stubAllPagesScans = arrayStubResponse<ScanCommandInput, ScanCommandOutput[]>()

  constructor() {
    // Needed because of Javascript and weird 'this' behavior when using dynamic binding
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this#bound_methods_in_classes
    this.queryOnePage = this.queryOnePage.bind(this)
    this.queryAllPages = this.queryAllPages.bind(this)
    this.scanOnePage = this.scanOnePage.bind(this)
    this.scanAllPages = this.scanAllPages.bind(this)
  }

  async put(params: PutCommandInput) {
    this.puts.push(params)
    return this.stubPuts.getResponse(params) ?? METADATA
  }

  async batchWrite(params: BatchWriteCommandInput): Promise<BatchWriteCommandOutput> {
    this.batchWrites.push(params)
    return METADATA
  }

  async update(params: UpdateCommandInput): Promise<UpdateCommandOutput> {
    this.updates.push(params)
    return METADATA
  }

  async get(params: GetCommandInput) {
    return this.stubGets.getResponse(params) ?? METADATA
  }

  async batchGet(params: BatchGetCommandInput) {
    return this.stubBatchGets.getResponse(params) ?? METADATA
  }

  async delete(params: DeleteCommandInput) {
    this.deletes.push(params)
    return METADATA
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transactionWrite(params: TransactWriteCommandInput) {
    return METADATA
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transactionGet(params: TransactGetCommandInput) {
    return METADATA
  }

  async queryOnePage(params: QueryCommandInput) {
    return this.stubOnePageQueries.getResponse(params) ?? METADATA
  }

  async queryAllPages(params: QueryCommandInput) {
    return this.stubAllPagesQueries.getResponse(params) ?? [METADATA]
  }

  async scanOnePage(params: ScanCommandInput) {
    return this.stubOnePageScans.getResponse(params) ?? METADATA
  }

  async scanAllPages(params: ScanCommandInput) {
    return this.stubAllPagesScans.getResponse(params) ?? [METADATA]
  }
}
