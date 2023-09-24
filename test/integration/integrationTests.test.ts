/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { initAWSResources } from './testSupportCode/integrationTestEnvironment'
import { rangeWhereNameBetween, Sheep, SHEEP_ENTITY } from '../examples/sheepTypeAndEntity'
import {
  alisonIdentifier,
  alisonTheAlpaca,
  babs,
  bobIdentifier,
  bobTheSheep,
  bunty,
  chesterDog,
  cluck,
  ginger,
  gingerIdentifier,
  peggyCat,
  shaunIdentifier,
  shaunTheSheep,
  sunflowerFarm,
  waddles,
  yolko
} from '../examples/testData'
import { DeleteCommand, DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'
import {
  AllEntitiesStore,
  createMinimumSingleTableConfig,
  createStandardMultiTableConfig,
  createStandardSingleTableConfig,
  createStore,
  createStoreContext,
  noopLogger,
  SingleEntityOperations,
  TablesConfig
} from '../../src/lib'
import {
  Chicken,
  CHICKEN_ENTITY,
  findOlderThan,
  findYoungerThan,
  gsiBreed,
  TWO_GSI_CHICKEN_ENTITY
} from '../examples/chickenTypeAndEntity'
import { FARM_ENTITY } from '../examples/farmTypeAndEntity'
import { FakeClock } from '../unit/testSupportCode/fakes/fakeClock'
import { DUCK_ENTITY } from '../examples/duckTypeAndEntity'
import { DOG_ENTITY } from '../examples/dogTypeAndEntity'
import { CAT_ENTITY } from '../examples/catTypeAndEntity'

let documentClient: DynamoDBDocumentClient
let testTableName: string
let testTableTwoName: string
let twoGSITableName: string
let customTableName: string
let farmTableName: string
const clock = new FakeClock()

export function resetClock() {
  setClock('2023-07-01T19:00:00.000Z')
}

export function setClock(isoTime: string) {
  clock.fakeNowIso = isoTime
}

beforeAll(async () => {
  const awsEnv = await initAWSResources()
  documentClient = awsEnv.documentClient
  testTableName = awsEnv.testTableName
  testTableTwoName = awsEnv.testTableTwoName
  twoGSITableName = awsEnv.twoGSITableName
  customTableName = awsEnv.customTableName
  farmTableName = awsEnv.farmTableName
})

export async function scanWithDocClient(tableName: string) {
  return (await documentClient.send(new ScanCommand({ TableName: tableName }))).Items ?? []
}

export async function emptyTable(tableName: string, isCustomTable?: boolean) {
  const pk = isCustomTable ? 'CustomPK' : 'PK'
  const sk = isCustomTable ? 'CustomSK' : 'SK'

  const items = await scanWithDocClient(tableName)
  for (const item of items) {
    await documentClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {
          [pk]: item[pk],
          [sk]: item[sk]
        }
      })
    )
  }
}

beforeEach(() => {
  resetClock()
})

describe('standard single table', () => {
  let tableName: string
  let store: AllEntitiesStore
  let storeWithScans: AllEntitiesStore
  let sheepOperations: SingleEntityOperations<Sheep, Pick<Sheep, 'breed'>, Pick<Sheep, 'name'>>
  let sheepOperationsWithScans: SingleEntityOperations<Sheep, Pick<Sheep, 'breed'>, Pick<Sheep, 'name'>>
  let chickenOperations: SingleEntityOperations<
    Chicken,
    Pick<Chicken, 'breed'>,
    Pick<Chicken, 'name' | 'dateOfBirth'>
  >
  beforeAll(() => {
    tableName = testTableName
    // store = defineStandardSingleTableStore(documentClient, tableName)
    // storeWithScans = defineStandardSingleTableStore(documentClient, tableName, { allowScans: true })
    store = createStore(
      createStandardSingleTableConfig(tableName),
      createStoreContext({ clock, logger: noopLogger }, documentClient)
    )
    storeWithScans = createStore(
      { ...createStandardSingleTableConfig(tableName), allowScans: true },
      createStoreContext({ clock, logger: noopLogger }, documentClient)
    )
    sheepOperations = store.for(SHEEP_ENTITY)
    sheepOperationsWithScans = storeWithScans.for(SHEEP_ENTITY)
    chickenOperations = store.for(CHICKEN_ENTITY)
  })

  describe('sheep-no-gsi-simple-operations', () => {
    test('put, get, update, delete', async () => {
      await emptyTable(tableName)

      // put (new item)
      expect(await sheepOperations.put(shaunTheSheep)).toEqual(shaunTheSheep)
      expect(await scanWithDocClient(tableName)).toEqual([
        {
          PK: 'SHEEP#BREED#merino',
          SK: 'NAME#shaun',
          _et: 'sheep',
          _lastUpdated: '2023-07-01T19:00:00.000Z',
          ...shaunTheSheep
        }
      ])

      // getOrUndefined
      expect(await sheepOperations.getOrUndefined(shaunIdentifier)).toEqual(shaunTheSheep)
      expect(await sheepOperations.getOrUndefined(bobIdentifier)).toEqual(undefined)

      // getOrThrow
      expect(await sheepOperations.getOrThrow(shaunIdentifier)).toEqual(shaunTheSheep)
      expect(async () => await sheepOperations.getOrThrow(bobIdentifier)).rejects.toThrowError(
        'Unable to find item for entity [sheep] with key source {"breed":"merino","name":"bob"}'
      )

      // put-overwrite
      setClock('2023-08-01T19:00:00.000Z')
      await sheepOperations.put({
        ...shaunTheSheep,
        ageInYears: 4
      })
      expect(await scanWithDocClient(tableName)).toEqual([
        {
          PK: 'SHEEP#BREED#merino',
          SK: 'NAME#shaun',
          _et: 'sheep',
          _lastUpdated: '2023-08-01T19:00:00.000Z',
          ...shaunTheSheep,
          ageInYears: 4
        }
      ])

      // update
      setClock('2023-09-01T19:00:00.000Z')
      await sheepOperations.update(shaunIdentifier, {
        update: {
          set: 'ageInYears = :newAge'
        },
        expressionAttributeValues: {
          ':newAge': 5
        }
      })
      expect(await sheepOperations.getOrUndefined(shaunIdentifier)).toEqual({
        ...shaunTheSheep,
        ageInYears: 5
      })
      expect(await scanWithDocClient(tableName)).toEqual([
        {
          PK: 'SHEEP#BREED#merino',
          SK: 'NAME#shaun',
          _et: 'sheep',
          _lastUpdated: '2023-09-01T19:00:00.000Z',
          ...shaunTheSheep,
          ageInYears: 5
        }
      ])

      // delete
      await sheepOperations.delete(shaunTheSheep)
      expect(await sheepOperations.getOrUndefined({ breed: 'merino', name: 'shaun' })).toBeUndefined()
      expect(await scanWithDocClient(tableName)).toEqual([])
    })

    test('condition expressions', async () => {
      await emptyTable(tableName)
      // Simple condition
      // Valid condition should be successful
      await sheepOperations.put(shaunTheSheep, { conditionExpression: 'attribute_not_exists(PK)' })
      // Invalid condition should fail
      expect(
        async () =>
          await sheepOperations.put(shaunTheSheep, { conditionExpression: 'attribute_not_exists(PK)' })
      ).rejects.toThrowError('The conditional request failed')

      // Condition with attribute names
      // Valid condition should be successful
      await sheepOperations.put(shaunTheSheep, {
        conditionExpression: 'NOT #name = :invalidname',
        expressionAttributeNames: {
          '#name': 'name'
        },
        expressionAttributeValues: {
          ':invalidname': 'bob'
        }
      })
      // Invalid condition should fail
      expect(
        async () =>
          await sheepOperations.put(shaunTheSheep, {
            conditionExpression: 'NOT #name = :invalidname',
            expressionAttributeNames: {
              '#name': 'name'
            },
            expressionAttributeValues: {
              ':invalidname': 'shaun'
            }
          })
      ).rejects.toThrowError('The conditional request failed')

      await sheepOperations.put(shaunTheSheep)
      expect(
        async () =>
          await sheepOperations.update(shaunIdentifier, {
            update: {
              set: 'ageInYears = :newAge'
            },
            conditionExpression: '#ageInYears < :invalidAge',
            expressionAttributeNames: {
              '#ageInYears': 'ageInYears'
            },
            expressionAttributeValues: {
              ':invalidAge': 3,
              ':newAge': 3
            }
          })
      ).rejects.toThrowError('The conditional request failed')

      // Shouldn't be able to delete bob if asserting he exists (we haven't previous put him here)
      expect(
        async () =>
          await sheepOperations.delete(bobIdentifier, {
            conditionExpression: 'attribute_exists(PK)'
          })
      ).rejects.toThrowError('The conditional request failed')
    })

    describe('queries-and-scans', () => {
      beforeAll(async () => {
        await emptyTable(tableName)
        await sheepOperations.put(shaunTheSheep)
        await sheepOperations.put(bobTheSheep)
        await sheepOperations.put(alisonTheAlpaca)
      })

      test('query one page by PK', async () => {
        const result = await sheepOperations.queryOnePageByPk({ breed: 'merino' })
        expect(result.items).toEqual([bobTheSheep, shaunTheSheep])
        expect(result.lastEvaluatedKey).toBeUndefined()
      })

      test('query all pages by PK', async () => {
        const result = await sheepOperations.queryAllByPk({ breed: 'merino' })
        expect(result).toEqual([bobTheSheep, shaunTheSheep])

        const resultBackwards = await sheepOperations.queryAllByPk(
          { breed: 'merino' },
          { scanIndexForward: false }
        )
        expect(resultBackwards).toEqual([shaunTheSheep, bobTheSheep])
      })

      test('query with limit', async () => {
        const result = await sheepOperations.queryOnePageByPk({ breed: 'merino' }, { limit: 1 })
        // We set limit to 1, so we should only get 1 item - which one is defined by the SK, and "bob" comes before, "shaun"
        expect(result.items).toEqual([bobTheSheep])
        expect(result.lastEvaluatedKey).toEqual({
          PK: 'SHEEP#BREED#merino',
          SK: 'NAME#bob'
        })
        const secondResult = await sheepOperations.queryOnePageByPk(
          { breed: 'merino' },
          { limit: 1, exclusiveStartKey: result.lastEvaluatedKey }
        )
        expect(secondResult.items).toEqual([shaunTheSheep])
      })

      test('query backwards', async () => {
        // // scanIndexForward is false, so we get the LAST result, according to DynamoDB ordering
        expect(
          (await sheepOperations.queryOnePageByPk({ breed: 'merino' }, { limit: 1, scanIndexForward: false }))
            .items
        ).toEqual([shaunTheSheep])
      })

      test('query all pages by pk and sk', async () => {
        const result = await sheepOperations.queryAllByPkAndSk(
          { breed: 'merino' },
          rangeWhereNameBetween('charlie', 'terry')
        )
        expect(result).toEqual([shaunTheSheep])
      })

      test('query one page by pk and sk', async () => {
        const result = await sheepOperations.queryOnePageByPkAndSk(
          { breed: 'merino' },
          rangeWhereNameBetween('charlie', 'terry')
        )
        expect(result.items).toEqual([shaunTheSheep])
        expect(result.lastEvaluatedKey).toBeUndefined()
      })

      test('scan disabled by default', async () => {
        expect(async () => await sheepOperations.scanOnePage()).rejects.toThrowError(
          'Scan operations are disabled for this store'
        )
      })

      test('scan one page', async () => {
        const result = await sheepOperationsWithScans.scanOnePage()
        expect(result.items).toEqual([alisonTheAlpaca, bobTheSheep, shaunTheSheep])
        expect(result.lastEvaluatedKey).toBeUndefined()
      })

      test('scan all pages', async () => {
        const result = await sheepOperationsWithScans.scanAll()
        expect(result).toEqual([alisonTheAlpaca, bobTheSheep, shaunTheSheep])
      })

      test('scan with limit', async () => {
        const result = await sheepOperationsWithScans.scanOnePage({ limit: 2 })
        // We set limit to 2, so we should only get 2 items - which ones are defined by dynamodb ordering
        expect(result.items).toEqual([alisonTheAlpaca, bobTheSheep])
        expect(result.lastEvaluatedKey).toEqual({
          PK: 'SHEEP#BREED#merino',
          SK: 'NAME#bob'
        })

        const secondResult = await sheepOperationsWithScans.scanOnePage({
          limit: 2,
          exclusiveStartKey: result.lastEvaluatedKey
        })
        expect(secondResult.items).toEqual([shaunTheSheep])
        expect(secondResult.lastEvaluatedKey).toBeUndefined()
      })
    })
  })

  describe('advancedOperations', () => {
    test('put, get delete', async () => {
      await emptyTable(tableName)

      const putResponse = await sheepOperations.advancedOperations.put(shaunTheSheep, {
        returnConsumedCapacity: 'TOTAL',
        returnItemCollectionMetrics: 'SIZE',
        returnValues: 'ALL_OLD'
      })
      expect(putResponse.metadata?.consumedCapacity?.CapacityUnits).toBeDefined()
      // TODO eventually - test putResponse.metadata?.itemCollectionMetrics - requires an example with a collection in item
      // only get returned attributes if an overwrite occurred
      expect(putResponse.unparsedReturnedAttributes).toBeUndefined()

      const secondPut = await sheepOperations.advancedOperations.put(
        { ...shaunTheSheep, ageInYears: 11 },
        { returnValues: 'ALL_OLD' }
      )
      expect(secondPut.unparsedReturnedAttributes).toEqual({
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun',
        _et: 'sheep',
        _lastUpdated: '2023-07-01T19:00:00.000Z',
        ageInYears: 3,
        breed: 'merino',
        name: 'shaun'
      })

      // The actual attributes from the existing record in the table are available in the 'Item' field of the error
      // This is just the error generated in the AWS SDK
      expect(
        async () =>
          await sheepOperations.advancedOperations.put(
            { ...shaunTheSheep, ageInYears: 31 },
            {
              conditionExpression: 'attribute_not_exists(PK)',
              returnValuesOnConditionCheckFailure: 'ALL_OLD'
            }
          )
      ).rejects.toThrowError('The conditional request failed')

      const getOrUndefined = await sheepOperations.advancedOperations.getOrUndefined(shaunIdentifier, {
        returnConsumedCapacity: 'TOTAL'
      })
      expect(getOrUndefined.item).toEqual({ ...shaunTheSheep, ageInYears: 11 })
      expect(getOrUndefined.metadata?.consumedCapacity?.CapacityUnits).toBeDefined()
      expect(getOrUndefined.metadata?.consumedCapacity?.TableName).toBeDefined()

      const getOrThrow = await sheepOperations.advancedOperations.getOrThrow(shaunIdentifier, {
        returnConsumedCapacity: 'TOTAL'
      })
      expect(getOrThrow.item).toEqual({ ...shaunTheSheep, ageInYears: 11 })
      expect(getOrThrow.metadata?.consumedCapacity?.CapacityUnits).toBeDefined()
      expect(getOrThrow.metadata?.consumedCapacity?.TableName).toBeDefined()

      const deleteResponse = await sheepOperations.advancedOperations.delete(shaunTheSheep, {
        returnConsumedCapacity: 'TOTAL',
        returnValues: 'ALL_OLD'
      })
      expect(deleteResponse.metadata?.consumedCapacity?.CapacityUnits).toBeDefined()
      expect(deleteResponse.unparsedReturnedAttributes).toEqual({
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun',
        _et: 'sheep',
        _lastUpdated: '2023-07-01T19:00:00.000Z',
        ageInYears: 11,
        breed: 'merino',
        name: 'shaun'
      })

      await sheepOperations.put(shaunTheSheep)
      setClock('2023-08-01T19:00:00.000Z')
      const updateOne = await sheepOperations.advancedOperations.update(shaunIdentifier, {
        update: {
          set: 'ageInYears = :newAge'
        },
        expressionAttributeValues: {
          ':newAge': 4
        },
        returnConsumedCapacity: 'TOTAL',
        returnValues: 'ALL_NEW',
        returnItemCollectionMetrics: 'SIZE',
        returnValuesOnConditionCheckFailure: 'ALL_OLD'
      })
      expect(updateOne.unparsedReturnedAttributes).toEqual({
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun',
        _et: 'sheep',
        _lastUpdated: '2023-08-01T19:00:00.000Z',
        ageInYears: 4,
        breed: 'merino',
        name: 'shaun'
      })
      expect(updateOne.metadata?.consumedCapacity).toBeDefined()
    })

    describe('queries-and-scans', () => {
      beforeAll(async () => {
        await emptyTable(tableName)
        await sheepOperations.put(shaunTheSheep)
        await sheepOperations.put(bobTheSheep)
        await sheepOperations.put(alisonTheAlpaca)
      })

      test('query one page by pk', async () => {
        const result = await sheepOperations.advancedOperations.queryOnePageByPk(
          { breed: 'merino' },
          { returnConsumedCapacity: 'TOTAL', limit: 1 }
        )
        expect(result.items).toEqual([bobTheSheep])
        expect(result.lastEvaluatedKey).toEqual({
          PK: 'SHEEP#BREED#merino',
          SK: 'NAME#bob'
        })
        expect(result.metadata?.consumedCapacities?.length).toBeGreaterThan(0)
      })

      test('query all pages by pk', async () => {
        const result = await sheepOperations.advancedOperations.queryAllByPk(
          { breed: 'merino' },
          { returnConsumedCapacity: 'TOTAL' }
        )
        expect(result.items).toEqual([bobTheSheep, shaunTheSheep])
        expect(result.lastEvaluatedKey).toBeUndefined()
        expect(result.metadata?.consumedCapacities?.length).toBeGreaterThan(0)
      })

      test('query all pages by pk and sk', async () => {
        const result = await sheepOperations.advancedOperations.queryAllByPkAndSk(
          { breed: 'merino' },
          rangeWhereNameBetween('charlie', 'terry'),
          { returnConsumedCapacity: 'TOTAL' }
        )
        expect(result.items).toEqual([shaunTheSheep])
        expect(result.lastEvaluatedKey).toBeUndefined()
        expect(result.metadata?.consumedCapacities?.length).toBeGreaterThan(0)
      })

      test('query one page by pk and sk', async () => {
        const result = await sheepOperations.advancedOperations.queryOnePageByPkAndSk(
          { breed: 'merino' },
          rangeWhereNameBetween('charlie', 'terry'),
          { returnConsumedCapacity: 'TOTAL', limit: 1 }
        )
        expect(result.items).toEqual([shaunTheSheep])
        expect(result.lastEvaluatedKey).toEqual({
          PK: 'SHEEP#BREED#merino',
          SK: 'NAME#shaun'
        })
        expect(result.metadata?.consumedCapacities?.length).toBeGreaterThan(0)
      })

      test('scan disabled by default', async () => {
        expect(async () => await sheepOperations.advancedOperations.scanOnePage()).rejects.toThrowError(
          'Scan operations are disabled for this store'
        )
      })

      test('scan with metadata', async () => {
        const result = await sheepOperationsWithScans.advancedOperations.scanOnePage({
          returnConsumedCapacity: 'TOTAL'
        })
        expect(result.items).toEqual([alisonTheAlpaca, bobTheSheep, shaunTheSheep])
        expect(result.lastEvaluatedKey).toBeUndefined()
        expect(result.unparsedItems).toBeUndefined()
        expect(result.metadata?.consumedCapacities?.length).toBeGreaterThan(0)
      })

      test('scan all pages with metadata', async () => {
        const result = await sheepOperationsWithScans.advancedOperations.scanAll({
          returnConsumedCapacity: 'TOTAL'
        })
        expect(result.items).toEqual([alisonTheAlpaca, bobTheSheep, shaunTheSheep])
        expect(result.unparsedItems).toBeUndefined()
        expect(result.lastEvaluatedKey).toBeUndefined()
        expect(result.metadata?.consumedCapacities?.length).toBeGreaterThan(0)
      })
    })

    describe('batch operations', () => {
      test('puts, gets, deletes', async () => {
        await emptyTable(tableName)

        const putResult = await sheepOperations.advancedOperations.batchPut(
          [shaunTheSheep, bobTheSheep, alisonTheAlpaca],
          {
            batchSize: 2,
            ttl: 1234
          }
        )
        expect(putResult).toEqual({})
        const items = await scanWithDocClient(testTableName)
        expect(items.length).toEqual(3)
        expect(items[0]).toEqual({
          PK: 'SHEEP#BREED#alpaca',
          SK: 'NAME#alison',
          _et: 'sheep',
          _lastUpdated: '2023-07-01T19:00:00.000Z',
          ttl: 1234,
          ...alisonTheAlpaca
        })

        const getResult = await sheepOperations.advancedOperations.batchGet(
          [shaunIdentifier, bobIdentifier, alisonIdentifier],
          {
            batchSize: 2
          }
        )
        const batchGetResultItems = getResult.items
        // Ordering of batch get is non-deterministic, hence the "contain equal"s here
        expect(batchGetResultItems).toContainEqual(shaunTheSheep)
        expect(batchGetResultItems).toContainEqual(bobTheSheep)
        expect(batchGetResultItems).toContainEqual(alisonTheAlpaca)
        expect(batchGetResultItems.length).toEqual(3)
        expect(getResult.metadata).toBeUndefined()

        const deleteResult = await sheepOperations.advancedOperations.batchDelete(
          [shaunIdentifier, bobIdentifier, alisonIdentifier],
          {
            batchSize: 2
          }
        )
        expect(deleteResult).toEqual({})
        expect((await scanWithDocClient(tableName)).length).toEqual(0)
      })

      test('batch operations with metadata', async () => {
        await emptyTable(tableName)

        const putResult = await sheepOperations.advancedOperations.batchPut(
          [shaunTheSheep, bobTheSheep, alisonTheAlpaca],
          {
            batchSize: 2,
            ttl: 1234,
            returnConsumedCapacity: 'TOTAL',
            returnItemCollectionMetrics: 'SIZE'
          }
        )
        expect(putResult.metadata?.consumedCapacities).toBeDefined()
        expect(putResult.metadata?.itemCollectionMetricsCollection).toBeDefined()

        const getResult = await sheepOperations.advancedOperations.batchGet(
          [shaunIdentifier, bobIdentifier, alisonIdentifier],
          {
            batchSize: 2,
            returnConsumedCapacity: 'TOTAL'
          }
        )
        expect(getResult.metadata?.consumedCapacities).toBeDefined()

        const deleteResult = await sheepOperations.advancedOperations.batchDelete(
          [shaunIdentifier, bobIdentifier, alisonIdentifier],
          {
            batchSize: 2,
            returnConsumedCapacity: 'TOTAL',
            returnItemCollectionMetrics: 'SIZE'
          }
        )
        expect(deleteResult.metadata?.consumedCapacities).toBeDefined()
        expect(deleteResult.metadata?.itemCollectionMetricsCollection).toBeDefined()
      })
    })
  })

  describe('chickens-with-gsi', () => {
    test('put-sets-gsi-attributes', async () => {
      await emptyTable(testTableName)
      await chickenOperations.put(ginger)
      expect(await scanWithDocClient(testTableName)).toEqual([
        {
          PK: 'CHICKEN#BREED#sussex',
          SK: 'DATEOFBIRTH#2021-07-01#NAME#ginger',
          GSIPK: 'COOP#bristol',
          GSISK: 'CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01',
          _et: 'chicken',
          _lastUpdated: '2023-07-01T19:00:00.000Z',
          ...ginger
        }
      ])

      expect(
        await chickenOperations.getOrUndefined({ breed: 'sussex', name: 'ginger', dateOfBirth: '2021-07-01' })
      ).toEqual(ginger)
      expect(
        await chickenOperations.getOrUndefined({ breed: 'sussex', name: 'babs', dateOfBirth: '2021-09-01' })
      ).toBeUndefined()
    })

    describe('queries-and-scans', () => {
      beforeAll(async () => {
        await emptyTable(testTableName)
        await chickenOperations.put(ginger)
        await chickenOperations.put(babs)
        await chickenOperations.put(bunty)
        await chickenOperations.put(yolko)
        await chickenOperations.put(cluck)
      })

      test('queryByPk', async () => {
        const result = await chickenOperations.queryOnePageByPk({ breed: 'sussex' })
        expect(result.items).toEqual([yolko, ginger, babs, bunty])
      })

      test('queryByPkAndSk', async () => {
        const olderResult = await chickenOperations.queryOnePageByPkAndSk(
          { breed: 'sussex' },
          findOlderThan('2021-10-01')
        )
        expect(olderResult.items).toEqual([yolko, ginger, babs])

        // Get youngest (latest in SK) first
        const youngerResult = await chickenOperations.queryOnePageByPkAndSk(
          { breed: 'sussex' },
          findYoungerThan('2021-08-01'),
          { scanIndexForward: false }
        )
        expect(youngerResult.items).toEqual([bunty, babs])
      })

      // TODO - test one page
      test('queryByGsiPk', async () => {
        const chickens = await chickenOperations.queryAllWithGsiByPk({ coop: 'dakota' })
        expect(chickens).toEqual([cluck, yolko])
      })

      // TODO - test one page
      test('queryByGsiPkAndSk', async () => {
        const result = await chickenOperations.queryAllWithGsiByPkAndSk(
          { coop: 'dakota' },
          gsiBreed('orpington')
        )
        expect(result).toEqual([cluck])
      })

      test('scan GSI disabled by default', async () => {
        expect(async () => await chickenOperations.scanOnePageWithGsi()).rejects.toThrowError(
          'Scan operations are disabled for this store'
        )
        expect(async () => await chickenOperations.scanAllWithGsi()).rejects.toThrowError(
          'Scan operations are disabled for this store'
        )
      })

      test('scan GSI', async () => {
        const chickenOperationsWithScans = storeWithScans.for(CHICKEN_ENTITY)
        const scanAllGsiResult = await chickenOperationsWithScans.scanAllWithGsi()
        expect(scanAllGsiResult).toEqual([ginger, babs, bunty, cluck, yolko])

        const scanFirstPageGsiResult = await chickenOperationsWithScans.scanOnePageWithGsi({
          limit: 2,
          gsiId: 'gsi'
        })
        expect(scanFirstPageGsiResult.items).toEqual([ginger, babs])

        const scanSecondPageGsiResult = await chickenOperationsWithScans.scanOnePageWithGsi({
          limit: 5,
          gsiId: 'gsi',
          exclusiveStartKey: scanFirstPageGsiResult.lastEvaluatedKey
        })
        expect(scanSecondPageGsiResult.items).toEqual([bunty, cluck, yolko])
        expect(scanSecondPageGsiResult.lastEvaluatedKey).toBeUndefined()
      })
    })
  })

  describe('transactions API', () => {
    beforeEach(async () => {
      await emptyTable(testTableName)
    })

    // TODO - need test for conditionCheck

    test('put', async () => {
      await store.transactions
        .buildWriteTransaction(SHEEP_ENTITY)
        .put(shaunTheSheep)
        .put(bobTheSheep)
        .nextEntity(CHICKEN_ENTITY)
        .put(ginger)
        .execute()

      expect(await scanWithDocClient(testTableName)).toEqual([
        {
          PK: 'CHICKEN#BREED#sussex',
          SK: 'DATEOFBIRTH#2021-07-01#NAME#ginger',
          GSIPK: 'COOP#bristol',
          GSISK: 'CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01',
          _et: 'chicken',
          _lastUpdated: '2023-07-01T19:00:00.000Z',
          ...ginger
        },
        {
          PK: 'SHEEP#BREED#merino',
          SK: 'NAME#bob',
          _et: 'sheep',
          _lastUpdated: '2023-07-01T19:00:00.000Z',
          ...bobTheSheep
        },
        {
          PK: 'SHEEP#BREED#merino',
          SK: 'NAME#shaun',
          _et: 'sheep',
          _lastUpdated: '2023-07-01T19:00:00.000Z',
          ...shaunTheSheep,
          ageInYears: 3
        }
      ])
    })

    test('put and delete', async () => {
      await store.for(SHEEP_ENTITY).put(shaunTheSheep)
      expect(await scanWithDocClient(testTableName)).toEqual([
        {
          PK: 'SHEEP#BREED#merino',
          SK: 'NAME#shaun',
          _et: 'sheep',
          _lastUpdated: '2023-07-01T19:00:00.000Z',
          ...shaunTheSheep,
          ageInYears: 3
        }
      ])

      await store.transactions
        .buildWriteTransaction(SHEEP_ENTITY)
        .delete(shaunTheSheep)
        .nextEntity(CHICKEN_ENTITY)
        .put(ginger)
        .execute()

      expect(await scanWithDocClient(testTableName)).toEqual([
        {
          PK: 'CHICKEN#BREED#sussex',
          SK: 'DATEOFBIRTH#2021-07-01#NAME#ginger',
          GSIPK: 'COOP#bristol',
          GSISK: 'CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01',
          _et: 'chicken',
          _lastUpdated: '2023-07-01T19:00:00.000Z',
          ...ginger
        }
      ])
    })

    test('get', async () => {
      await store.for(SHEEP_ENTITY).put(shaunTheSheep)
      await store.for(SHEEP_ENTITY).put(bobTheSheep)
      await store.for(CHICKEN_ENTITY).put(ginger)

      expect(
        await store.transactions
          .buildGetTransaction(SHEEP_ENTITY)
          .get(shaunIdentifier)
          .get(alisonIdentifier)
          .get(bobIdentifier)
          .nextEntity(CHICKEN_ENTITY)
          .get(gingerIdentifier)
          .execute()
      ).toEqual({
        itemsByEntityType: {
          sheep: [shaunTheSheep, null, bobTheSheep],
          chicken: [ginger]
        }
      })

      expect(
        (
          await store.transactions
            .buildGetTransaction(SHEEP_ENTITY)
            .get(shaunIdentifier)
            .execute({ returnConsumedCapacity: 'TOTAL' })
        ).metadata?.consumedCapacity
      ).toBeDefined()
    })
  })

  describe('multi-entity API', () => {
    describe('query', () => {
      beforeAll(async () => {
        await emptyTable(testTableName)
        await store.for(DUCK_ENTITY).put(waddles)
        await store.for(CHICKEN_ENTITY).put(ginger)
        await store.for(DOG_ENTITY).put(chesterDog)
        await store.for(CAT_ENTITY).put(peggyCat)
      })

      test('query multiple entities in one query', async () => {
        expect(
          await store
            .forMultiple([DUCK_ENTITY, CHICKEN_ENTITY])
            .queryWithGsi(DUCK_ENTITY)
            .byPk({ coop: 'bristol' })
        ).toEqual({
          itemsByEntityType: {
            chicken: [ginger],
            duck: [waddles]
          }
        })
      })

      test('query table where multiple entities returned', async () => {
        // Single Entity API
        expect(
          await store.for(DOG_ENTITY).advancedOperations.queryAllByPk({ farm: 'Sunflower Farm' })
        ).toEqual({
          items: [chesterDog],
          unparsedItems: [
            {
              PK: 'FARM#Sunflower Farm',
              SK: 'CAT#NAME#Peggy',
              _et: 'cat',
              _lastUpdated: '2023-07-01T19:00:00.000Z',
              ageInYears: 7,
              farm: 'Sunflower Farm',
              name: 'Peggy'
            }
          ]
        })

        // Multiple Entity API
        expect(
          await store.forMultiple([DOG_ENTITY]).query(DOG_ENTITY).byPk({ farm: 'Sunflower Farm' })
        ).toEqual({
          itemsByEntityType: {
            dog: [chesterDog]
          },
          unparsedItems: [
            {
              PK: 'FARM#Sunflower Farm',
              SK: 'CAT#NAME#Peggy',
              _et: 'cat',
              _lastUpdated: '2023-07-01T19:00:00.000Z',
              ageInYears: 7,
              farm: 'Sunflower Farm',
              name: 'Peggy'
            }
          ]
        })
      })

      test('query GSI where multiple entities returned', async () => {
        // query GSI single entity API where multiple entities returned from table
        expect(
          await store.for(DUCK_ENTITY).advancedOperations.queryAllWithGsiByPk({ coop: 'bristol' })
        ).toEqual({
          items: [waddles],
          unparsedItems: [
            {
              PK: 'CHICKEN#BREED#sussex',
              SK: 'DATEOFBIRTH#2021-07-01#NAME#ginger',
              GSIPK: 'COOP#bristol',
              GSISK: 'CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01',
              _et: 'chicken',
              _lastUpdated: '2023-07-01T19:00:00.000Z',
              ...ginger
            }
          ]
        })

        // query GSI single entity with multiple entity api where multiple returned from table
        expect(
          await store.forMultiple([DUCK_ENTITY]).queryWithGsi(DUCK_ENTITY).byPk({ coop: 'bristol' })
        ).toEqual({
          itemsByEntityType: {
            duck: [waddles]
          },
          unparsedItems: [
            {
              PK: 'CHICKEN#BREED#sussex',
              SK: 'DATEOFBIRTH#2021-07-01#NAME#ginger',
              GSIPK: 'COOP#bristol',
              GSISK: 'CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01',
              _et: 'chicken',
              _lastUpdated: '2023-07-01T19:00:00.000Z',
              ...ginger
            }
          ]
        })
      })
    })

    test('scan', async () => {
      await emptyTable(testTableName)
      await store.for(SHEEP_ENTITY).put(shaunTheSheep)
      await store.for(CHICKEN_ENTITY).put(ginger)

      expect(
        async () => await store.forMultiple([SHEEP_ENTITY, CHICKEN_ENTITY]).scanOnePage()
      ).rejects.toThrowError('Scan operations are disabled for this store')

      // Scan single entity API when multiple entities returned
      expect(await storeWithScans.for(SHEEP_ENTITY).advancedOperations.scanAll()).toEqual({
        items: [shaunTheSheep],
        unparsedItems: [
          {
            PK: 'CHICKEN#BREED#sussex',
            SK: 'DATEOFBIRTH#2021-07-01#NAME#ginger',
            GSIPK: 'COOP#bristol',
            GSISK: 'CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01',
            _et: 'chicken',
            _lastUpdated: '2023-07-01T19:00:00.000Z',
            ...ginger
          }
        ]
      })

      // Scan multiple entity API when all entities specified
      expect(await storeWithScans.forMultiple([SHEEP_ENTITY, CHICKEN_ENTITY]).scanOnePage()).toEqual({
        itemsByEntityType: {
          sheep: [shaunTheSheep],
          chicken: [ginger]
        }
      })

      // Scan multiple entity API when some entities not specified
      expect(await storeWithScans.forMultiple([SHEEP_ENTITY]).scanOnePage()).toEqual({
        itemsByEntityType: {
          sheep: [shaunTheSheep]
        },
        unparsedItems: [
          {
            PK: 'CHICKEN#BREED#sussex',
            SK: 'DATEOFBIRTH#2021-07-01#NAME#ginger',
            GSIPK: 'COOP#bristol',
            GSISK: 'CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01',
            _et: 'chicken',
            _lastUpdated: '2023-07-01T19:00:00.000Z',
            ...ginger
          }
        ]
      })
    })
  })
})

describe('single table with customizations', () => {
  let sheepOperations: SingleEntityOperations<Sheep, Pick<Sheep, 'breed'>, Pick<Sheep, 'name'>>
  let tableName: string
  beforeAll(async () => {
    tableName = customTableName
    const store = createStore(
      {
        ...createMinimumSingleTableConfig(tableName, { pk: 'CustomPK', sk: 'CustomSK' }),
        allowScans: true
      },
      createStoreContext({ clock, logger: noopLogger }, documentClient)
    )
    sheepOperations = store.for(SHEEP_ENTITY)
  })

  test('put, get, delete', async () => {
    await emptyTable(tableName, true)

    await sheepOperations.put(shaunTheSheep)
    expect(await scanWithDocClient(tableName)).toEqual([
      {
        CustomPK: 'SHEEP#BREED#merino',
        CustomSK: 'NAME#shaun',
        ...shaunTheSheep
      }
    ])

    expect(await sheepOperations.getOrUndefined(shaunIdentifier)).toEqual(shaunTheSheep)
    await sheepOperations.delete(shaunTheSheep)
    expect(await sheepOperations.getOrUndefined({ breed: 'merino', name: 'shaun' })).toBeUndefined()
  })

  test('update without lastUpdated and other customization', async () => {
    await sheepOperations.put(shaunTheSheep)
    setClock('2023-08-01T19:00:00.000Z')
    await sheepOperations.update(shaunIdentifier, {
      update: {
        set: 'ageInYears = :newAge'
      },
      expressionAttributeValues: {
        ':newAge': 4
      }
    })

    const items = await scanWithDocClient(tableName)
    expect(items.length).toEqual(1)
    expect(items[0]).toEqual({
      CustomPK: 'SHEEP#BREED#merino',
      CustomSK: 'NAME#shaun',
      ...shaunTheSheep,
      ageInYears: 4
    })
  })
})

describe('minimal single table', () => {
  let store: AllEntitiesStore
  let tableName: string
  beforeAll(() => {
    tableName = farmTableName
    store = createStore(
      {
        ...createMinimumSingleTableConfig(tableName, { pk: 'Name' }),
        allowScans: true
      },
      createStoreContext({ clock: new FakeClock(), logger: noopLogger }, documentClient)
    )
  })

  test('put, get, delete', async () => {
    const farmStore = store.for(FARM_ENTITY)
    await farmStore.advancedOperations.batchDelete(await farmStore.scanAll())
    expect(await scanWithDocClient(farmTableName)).toEqual([])

    await farmStore.put(sunflowerFarm)
    expect(await scanWithDocClient(farmTableName)).toEqual([
      {
        Name: 'Sunflower Farm'
      }
    ])

    const retrievedFarm = await farmStore.getOrThrow(sunflowerFarm)
    expect(retrievedFarm).toEqual(sunflowerFarm)

    await farmStore.delete(sunflowerFarm)
    expect(await scanWithDocClient(farmTableName)).toEqual([])
  })
})

describe('Multiple GSI Single Table', () => {
  let store: AllEntitiesStore
  beforeAll(async () => {
    const config = {
      ...createStandardSingleTableConfig(twoGSITableName),
      gsiNames: { gsi1: 'GSI1', gsi2: 'GSI2' }
    }
    config.metaAttributeNames.gsisById = {
      gsi1: { pk: 'GSI1PK', sk: 'GSI1SK' },
      gsi2: { pk: 'GSI2PK', sk: 'GSI2SK' }
    }

    store = createStore(config, createStoreContext({ clock, logger: noopLogger }, documentClient))
  })

  test('query with multiple GSIs', async () => {
    await emptyTable(twoGSITableName)
    await store.for(TWO_GSI_CHICKEN_ENTITY).put(ginger)
    // NB: Different GSI fields
    expect(await scanWithDocClient(twoGSITableName)).toEqual([
      {
        PK: 'CHICKEN#BREED#sussex',
        SK: 'DATEOFBIRTH#2021-07-01#NAME#ginger',
        GSI1PK: 'COOP#bristol',
        GSI1SK: 'CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01',
        GSI2PK: 'CHICKEN',
        GSI2SK: 'DATEOFBIRTH#2021-07-01',
        _et: 'chicken',
        _lastUpdated: '2023-07-01T19:00:00.000Z',
        breed: 'sussex',
        coop: 'bristol',
        dateOfBirth: '2021-07-01',
        name: 'ginger'
      }
    ])
    await store.for(TWO_GSI_CHICKEN_ENTITY).put(babs)
    await store.for(TWO_GSI_CHICKEN_ENTITY).put(yolko)

    const result = await store
      .for(TWO_GSI_CHICKEN_ENTITY)
      .queryAllWithGsiByPk({ coop: 'bristol' }, { gsiId: 'gsi1' })
    expect(result).toEqual([ginger, babs])
  })
})

describe('multi table custom config', () => {
  let store: AllEntitiesStore
  beforeAll(() => {
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
    store = createStore(
      config,
      createStoreContext({ clock: new FakeClock(), logger: noopLogger }, documentClient)
    )
  })

  beforeEach(async () => {
    await emptyTable(testTableName)
    await store.for(FARM_ENTITY).advancedOperations.batchDelete(await store.for(FARM_ENTITY).scanAll())
  })

  test('basic operations', async () => {
    await store.for(FARM_ENTITY).put(sunflowerFarm)
    await store.for(DOG_ENTITY).put(chesterDog)

    expect(await store.for(FARM_ENTITY).getOrThrow(sunflowerFarm)).toEqual(sunflowerFarm)
    expect(await store.for(DOG_ENTITY).getOrThrow(chesterDog)).toEqual(chesterDog)
  })

  test('multi-entity operations', async () => {
    await store.for(FARM_ENTITY).put(sunflowerFarm)
    await store.for(DOG_ENTITY).put(chesterDog)
    await store.for(CAT_ENTITY).put(peggyCat)
    // Can scan one table
    expect((await store.forMultiple([CAT_ENTITY, DOG_ENTITY]).scanOnePage()).itemsByEntityType).toEqual({
      cat: [peggyCat],
      dog: [chesterDog]
    })

    // Can't scan across tables
    expect(() => store.forMultiple([FARM_ENTITY, DOG_ENTITY])).toThrowError(
      'Several tables would be required for this operation - please select only entities stored in one table'
    )
  })

  test('transactions across multiple tables', async () => {
    await store.transactions
      .buildWriteTransaction(FARM_ENTITY)
      .put(sunflowerFarm)
      .nextEntity(DOG_ENTITY)
      .put(chesterDog)
      .execute()

    expect(await store.for(FARM_ENTITY).getOrThrow(sunflowerFarm)).toEqual(sunflowerFarm)
    expect(await store.for(DOG_ENTITY).getOrThrow(chesterDog)).toEqual(chesterDog)

    expect(
      await store.transactions
        .buildGetTransaction(FARM_ENTITY)
        .get(sunflowerFarm)
        .nextEntity(DOG_ENTITY)
        .get(chesterDog)
        .execute()
    ).toEqual({
      itemsByEntityType: {
        dog: [chesterDog],
        farm: [sunflowerFarm]
      }
    })
  })
})

describe('multi table standard config', () => {
  let store: AllEntitiesStore
  beforeAll(() => {
    // NB - no default table for this example
    store = createStore(
      createStandardMultiTableConfig({
        [testTableName]: [SHEEP_ENTITY.type],
        [testTableTwoName]: [DOG_ENTITY.type]
      }),
      createStoreContext({ clock: new FakeClock(), logger: noopLogger }, documentClient)
    )
  })

  test('basic operations', async () => {
    await emptyTable(testTableName)
    await emptyTable(testTableTwoName)
    await store.for(SHEEP_ENTITY).put(shaunTheSheep)
    await store.for(DOG_ENTITY).put(chesterDog)

    expect(await store.for(SHEEP_ENTITY).getOrThrow(shaunIdentifier)).toEqual(shaunTheSheep)
    expect(await store.for(DOG_ENTITY).getOrThrow(chesterDog)).toEqual(chesterDog)
    expect(async () => await store.for(CHICKEN_ENTITY).getOrThrow(ginger)).rejects.toThrowError(
      'Unable to locate table that supports entity type chicken'
    )

    // Should have been written to correct tables
    expect(await scanWithDocClient(testTableName)).toEqual([
      {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun',
        _et: 'sheep',
        _lastUpdated: '2023-07-01T19:00:00.000Z',
        ageInYears: 3,
        breed: 'merino',
        name: 'shaun'
      }
    ])
    expect(await scanWithDocClient(testTableTwoName)).toEqual([
      {
        PK: 'FARM#Sunflower Farm',
        SK: 'DOG#NAME#Chester',
        _et: 'dog',
        _lastUpdated: '2023-07-01T19:00:00.000Z',
        ageInYears: 4,
        farm: 'Sunflower Farm',
        name: 'Chester'
      }
    ])
  })
})
