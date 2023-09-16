import { expect } from 'vitest'
import { FakeClock } from '../../unit/testSupportCode/fakes/fakeClock'
import {
  createDocumentClient,
  customTableName,
  dynamoDbEmptyTable,
  dynamoDbScanTable,
  findCustomTableName,
  findTestTableName,
  testTableName
} from './awsEnvironment'
import {
  createStandardSingleTableConfig,
  createStore,
  createStoreContext,
  noopLogger
} from '../../../src/lib'

export const docClient = createDocumentClient()
export const clock = new FakeClock()
export const logger = noopLogger

export async function initialize({
  allowScans,
  emptyTable,
  useCustomTable
}: {
  emptyTable?: boolean
  allowScans?: boolean
  useCustomTable?: boolean
} = {}) {
  if (useCustomTable) {
    await findCustomTableName()
  } else {
    await findTestTableName()
  }
  const tableName = useCustomTable ? customTableName : testTableName
  if (emptyTable === undefined || emptyTable) {
    if (useCustomTable) {
      await dynamoDbEmptyTable(tableName, docClient, 'CustomPK', 'CustomSK')
    } else {
      await dynamoDbEmptyTable(tableName, docClient)
    }
    await dynamoDbEmptyTable(tableName, docClient)
    expect((await dynamoDbScanTable(tableName, docClient)).length).toEqual(0)
  }

  const config = {
    ...createStandardSingleTableConfig(tableName),
    allowScans
  }
  if (useCustomTable) {
    config.metaAttributeNames = {
      pk: 'CustomPK',
      sk: 'CustomSK'
    }
  }

  clock.fakeNowIso = '2023-07-01T19:00:00.000Z'

  return createStore(config, createStoreContext({ clock, logger }, docClient))
}
