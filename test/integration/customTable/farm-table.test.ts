import { describe, expect, test } from 'vitest'
import {
  createDocumentClient,
  dynamoDbScanTable,
  farmTableName,
  findFarmTableName
} from '../testSupportCode/awsEnvironment'
import { documentClientBackedInterface } from '../../../src/lib/dynamoDBInterface'
import { FakeClock } from '../../unit/fakes/fakeClock'
import { Farm, FARM_ENTITY } from '../../examples/farmTypeAndEntity'
import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { createStore } from '../../../src/lib/tableBackedStore'
import { createMinimumTable } from '../../../src/lib/support/configSupport'
import { consoleLogger } from '../../../src/lib/util/logger'

const docClient = createDocumentClient()

async function initializeStoreAndTable(options: { emptyTable?: boolean; allowScans?: boolean } = {}) {
  await findFarmTableName()
  expect(farmTableName).toBeDefined()

  const logger = consoleLogger
  const store = createStore({
    store: {
      globalDynamoDB: documentClientBackedInterface({ documentClient: docClient, logger }),
      clock: new FakeClock(),
      logger
    },
    tables: {
      table: {
        ...createMinimumTable(farmTableName, 'Name'),
        allowScans: true
      }
    }
  })

  if (options.emptyTable === undefined || options.emptyTable) {
    const allRecords = (await store.for(FARM_ENTITY).scan({ allPages: true })).items
    for (const item of allRecords) {
      await docClient.send(
        new DeleteCommand({
          TableName: farmTableName,
          Key: {
            Name: item.name
          }
        })
      )
    }
    expect((await dynamoDbScanTable(farmTableName, docClient)).length).toEqual(0)
  }

  return store
}

describe('farm', () => {
  const sunflowerFarm: Farm = { name: 'Sunflower Farm' }

  describe('basic operations', () => {
    test('put, get, delete', async () => {
      const farmStore = (await initializeStoreAndTable()).for(FARM_ENTITY)
      await farmStore.put(sunflowerFarm)
      const items = await dynamoDbScanTable(farmTableName, docClient)
      expect(items.length).toEqual(1)
      expect(items[0]).toEqual({
        Name: 'Sunflower Farm'
      })

      const retrievedFarm = await farmStore.getOrThrow(sunflowerFarm)
      expect(retrievedFarm).toEqual({ item: sunflowerFarm })

      await farmStore.delete(sunflowerFarm)
      expect((await dynamoDbScanTable(farmTableName, docClient)).length).toEqual(0)
    })
  })
})
