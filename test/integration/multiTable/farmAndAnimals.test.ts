import {
  createDocumentClient,
  dynamoDbEmptyTable,
  dynamoDbScanTable,
  farmTableName,
  findFarmTableName,
  findTestTableName,
  testTableName
} from '../testSupportCode/awsEnvironment'
import { describe, expect, test } from 'vitest'
import {
  createMinimumSingleTableConfig,
  createStandardSingleTableConfig,
  createStore,
  createStoreContext,
  noopLogger,
  TablesConfig
} from '../../../src/lib'
import { FakeClock } from '../../unit/testSupportCode/fakes/fakeClock'
import { Farm, FARM_ENTITY } from '../../examples/farmTypeAndEntity'
import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { DOG_ENTITY } from '../../examples/dogTypeAndEntity'
import { chesterDog, peggyCat } from '../../examples/testData'
import { CAT_ENTITY } from '../../examples/catTypeAndEntity'

const docClient = createDocumentClient()

async function initializeStoreAndTable(options: { emptyTable?: boolean } = {}) {
  await findTestTableName()
  await findFarmTableName()
  expect(farmTableName).toBeDefined()
  const logger = noopLogger

  const config: TablesConfig = {
    defaultTableName: testTableName,
    entityTables: [
      {
        ...createStandardSingleTableConfig(testTableName),
        allowScans: true
      },
      {
        ...createMinimumSingleTableConfig(farmTableName, { pk: 'Name' }),
        allowScans: true,
        entityTypes: [FARM_ENTITY.type]
      }
    ]
  }

  const store = createStore(config, createStoreContext({ clock: new FakeClock(), logger }, docClient))

  if (options.emptyTable === undefined || options.emptyTable) {
    await dynamoDbEmptyTable(testTableName, docClient)
    expect((await dynamoDbScanTable(testTableName, docClient)).length).toEqual(0)
    const allRecords = await store.for(FARM_ENTITY).scanAll()
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

describe('farm and dog', () => {
  const sunflowerFarm: Farm = { name: 'Sunflower Farm' }

  describe('basic operations', () => {
    test('put, get', async () => {
      const store = await initializeStoreAndTable()
      await store.for(FARM_ENTITY).put(sunflowerFarm)
      await store.for(DOG_ENTITY).put(chesterDog)

      expect(await store.for(FARM_ENTITY).getOrThrow(sunflowerFarm)).toEqual(sunflowerFarm)
      expect(await store.for(DOG_ENTITY).getOrThrow(chesterDog)).toEqual(chesterDog)
    })
  })

  describe('multi entities', () => {
    test('Allow multiple entity collection operations from one table of several', async () => {
      const store = await initializeStoreAndTable()
      await store.for(FARM_ENTITY).put(sunflowerFarm)
      await store.for(DOG_ENTITY).put(chesterDog)
      await store.for(CAT_ENTITY).put(peggyCat)
      expect((await store.forMultiple([CAT_ENTITY, DOG_ENTITY]).scan()).itemsByEntityType).toEqual({
        cat: [peggyCat],
        dog: [chesterDog]
      })
    })

    test('Multiple entity scan / queries across table not allowed', async () => {
      const store = await initializeStoreAndTable()
      expect(() => store.forMultiple([FARM_ENTITY, DOG_ENTITY])).toThrowError(
        'Several tables would be required for this operation - please select only entities stored in one table'
      )
    })

    test('transactions across multiple tables', async () => {
      const store = await initializeStoreAndTable()
      await store.transactions
        .buildWriteTransaction(FARM_ENTITY)
        .put(sunflowerFarm)
        .nextEntity(DOG_ENTITY)
        .put(chesterDog)
        .execute()

      const retrievedFarm = await store.for(FARM_ENTITY).getOrThrow(sunflowerFarm)
      expect(retrievedFarm).toEqual(sunflowerFarm)
      const retrievedDog = await store.for(DOG_ENTITY).getOrThrow(chesterDog)
      expect(retrievedDog).toEqual(chesterDog)

      const getTransactionResults = await store.transactions
        .buildGetTransaction(FARM_ENTITY)
        .get(sunflowerFarm)
        .nextEntity(DOG_ENTITY)
        .get(chesterDog)
        .execute()

      expect(getTransactionResults.itemsByEntityType).toEqual({
        dog: [chesterDog],
        farm: [sunflowerFarm]
      })
    })
  })
})
