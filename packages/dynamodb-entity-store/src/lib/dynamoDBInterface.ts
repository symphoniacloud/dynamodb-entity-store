import {
  BatchGetCommand,
  BatchGetCommandInput,
  BatchGetCommandOutput,
  BatchWriteCommand,
  BatchWriteCommandInput,
  BatchWriteCommandOutput,
  DeleteCommand,
  DeleteCommandInput,
  DeleteCommandOutput,
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandInput,
  GetCommandOutput,
  paginateQuery,
  paginateScan,
  PutCommand,
  PutCommandInput,
  PutCommandOutput,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
  ScanCommand,
  ScanCommandInput,
  ScanCommandOutput,
  TransactGetCommand,
  TransactGetCommandInput,
  TransactGetCommandOutput,
  TransactWriteCommand,
  TransactWriteCommandInput,
  TransactWriteCommandOutput,
  UpdateCommand,
  UpdateCommandInput,
  UpdateCommandOutput
} from '@aws-sdk/lib-dynamodb'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { EntityStoreLogger, isDebugLoggingEnabled } from './util/index.js'

export interface DynamoDBInterface {
  put(params: PutCommandInput): Promise<PutCommandOutput>

  batchWrite(params: BatchWriteCommandInput): Promise<BatchWriteCommandOutput>

  update(params: UpdateCommandInput): Promise<UpdateCommandOutput>

  get(params: GetCommandInput): Promise<GetCommandOutput>

  batchGet(params: BatchGetCommandInput): Promise<BatchGetCommandOutput>

  delete(params: DeleteCommandInput): Promise<DeleteCommandOutput>

  transactionWrite(params: TransactWriteCommandInput): Promise<TransactWriteCommandOutput>

  transactionGet(params: TransactGetCommandInput): Promise<TransactGetCommandOutput>

  queryOnePage(params: QueryCommandInput): Promise<QueryCommandOutput>

  // We only return one property of `QueryCommandOutput`, but it means this is the same type of result of queryOnePage
  queryAllPages(params: QueryCommandInput): Promise<QueryCommandOutput[]>

  scanOnePage(params: ScanCommandInput): Promise<ScanCommandOutput>

  // We only return one property of `ScanCommandOutput`, but it means this is the same type of result of queryOnePage
  scanAllPages(params: ScanCommandInput): Promise<ScanCommandOutput[]>
}

export function documentClientBackedInterface(
  logger: EntityStoreLogger,
  documentClient?: DynamoDBDocumentClient
): DynamoDBInterface {
  const docClient = documentClient ?? DynamoDBDocumentClient.from(new DynamoDBClient({}))

  return {
    async put(params: PutCommandInput) {
      return await docClient.send(new PutCommand(params))
    },

    async batchWrite(params: BatchWriteCommandInput) {
      return await docClient.send(new BatchWriteCommand(params))
    },

    async update(params: UpdateCommandInput) {
      return await docClient.send(new UpdateCommand(params))
    },

    async get(params: GetCommandInput) {
      return await docClient.send(new GetCommand(params))
    },

    async batchGet(params: BatchGetCommandInput) {
      return await docClient.send(new BatchGetCommand(params))
    },

    async delete(params: DeleteCommandInput) {
      return await docClient.send(new DeleteCommand(params))
    },

    async transactionWrite(params: TransactWriteCommandInput) {
      return await docClient.send(new TransactWriteCommand(params))
    },

    async transactionGet(params: TransactGetCommandInput) {
      return await docClient.send(new TransactGetCommand(params))
    },

    async queryOnePage(params: QueryCommandInput) {
      return await docClient.send(new QueryCommand(params))
    },

    async queryAllPages(params: QueryCommandInput) {
      // See https://aws.amazon.com/blogs/developer/pagination-using-async-iterators-in-modular-aws-sdk-for-javascript/
      const pages: QueryCommandOutput[] = []
      for await (const page of paginateQuery({ client: docClient }, params)) {
        if (isDebugLoggingEnabled(logger)) {
          logger.debug('Received query results page', { page })
        }
        pages.push(page)
      }
      return pages
    },

    async scanOnePage(params: ScanCommandInput) {
      return await docClient.send(new ScanCommand(params))
    },

    async scanAllPages(params: ScanCommandInput) {
      // See https://aws.amazon.com/blogs/developer/pagination-using-async-iterators-in-modular-aws-sdk-for-javascript/
      const pages: ScanCommandOutput[] = []
      for await (const page of paginateScan({ client: docClient }, params)) {
        if (isDebugLoggingEnabled(logger)) {
          logger.debug('Received scan results page', { page })
        }
        pages.push(page)
      }
      return pages
    }
  }
}
