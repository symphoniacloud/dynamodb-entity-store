import { expect } from 'vitest'
import {
  StoreConfiguration,
  TableBackedStoreConfiguration,
  TableConfiguration
} from '../../../src/lib/tableBackedStoreConfiguration'
import { FakeClock } from '../../unit/fakes/fakeClock'
import {
  createDocumentClient,
  dynamoDbEmptyTable,
  dynamoDbScanTable,
  findCustomTableName,
  findTestTableName,
  testTableName
} from './awsEnvironment'
import { documentClientBackedInterface } from '../../../src/lib/dynamoDBInterface'
import { noopLogger } from '../../../src/lib/util/logger'
import { createStandardSingleTableStoreConfig } from '../../../src/lib/support/configSupport'
import { createStore } from '../../../src/lib/tableBackedStore'

export const docClient = createDocumentClient()
export const clock = new FakeClock()

export async function initialize(
  options: { emptyTable?: boolean; allowScans?: boolean } = {},
  customTableConfig?: TableConfiguration & { tableName?: string }
) {
  await findTestTableName()
  await findCustomTableName()

  expect(testTableName).toBeDefined()
  clock.fakeNowIso = '2023-07-01T19:00:00.000Z'

  if (options.emptyTable === undefined || options.emptyTable) {
    await dynamoDbEmptyTable(testTableName, docClient)
    expect((await dynamoDbScanTable(testTableName, docClient)).length).toEqual(0)
  }

  const storeConfig: StoreConfiguration = {
    globalDynamoDB: documentClientBackedInterface({ documentClient: docClient }),
    clock: clock,
    logger: noopLogger
  }

  const config: TableBackedStoreConfiguration = customTableConfig
    ? {
        store: storeConfig,
        tables: {
          table: { tableName: testTableName, ...customTableConfig }
        }
      }
    : createStandardSingleTableStoreConfig(testTableName, storeConfig, {
        allowScans: options.allowScans
      })

  return createStore(config)
}
