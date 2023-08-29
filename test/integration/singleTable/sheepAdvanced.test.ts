import { beforeAll, describe, expect, test } from 'vitest'
import { rangeWhereNameBetween, Sheep, SHEEP_ENTITY } from '../../examples/sheepTypeAndEntity'
import { dynamoDbScanTable, testTableName } from '../testSupportCode/awsEnvironment'
import { clock, docClient, initialize } from '../testSupportCode/appEnvironment'
import {
  alisonIdentifier,
  alisonTheAlpaca,
  bobIdentifier,
  bobTheSheep,
  shaunIdentifier,
  shaunTheSheep
} from '../../examples/testData'
import { SingleEntityAdvancedOperations } from '../../../src/lib'

describe('basic operations', () => {
  test('put, get delete', async () => {
    const sheepStore = (await initialize()).for(SHEEP_ENTITY)

    const putResponse = await sheepStore.advancedOperations.put(shaunTheSheep, {
      returnConsumedCapacity: 'TOTAL',
      returnItemCollectionMetrics: 'SIZE',
      returnValues: 'ALL_OLD'
    })
    expect(putResponse.metadata?.consumedCapacity?.CapacityUnits).toBeDefined()
    // TODO eventually - test putResponse.metadata?.itemCollectionMetrics - requires an example with a collection in item
    // only get returned attributes if an overwrite occurred
    expect(putResponse.unparsedReturnedAttributes).toBeUndefined()

    const secondPut = await sheepStore.advancedOperations.put(
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
        await sheepStore.advancedOperations.put(
          { ...shaunTheSheep, ageInYears: 31 },
          { conditionExpression: 'attribute_not_exists(PK)', returnValuesOnConditionCheckFailure: 'ALL_OLD' }
        )
    ).rejects.toThrowError('The conditional request failed')

    const getOrUndefined = await sheepStore.advancedOperations.getOrUndefined(shaunIdentifier, {
      returnConsumedCapacity: 'TOTAL'
    })
    expect(getOrUndefined.item).toEqual({ ...shaunTheSheep, ageInYears: 11 })
    expect(getOrUndefined.metadata?.consumedCapacity?.CapacityUnits).toBeDefined()
    expect(getOrUndefined.metadata?.consumedCapacity?.TableName).toBeDefined()

    const getOrThrow = await sheepStore.advancedOperations.getOrThrow(shaunIdentifier, {
      returnConsumedCapacity: 'TOTAL'
    })
    expect(getOrThrow.item).toEqual({ ...shaunTheSheep, ageInYears: 11 })
    expect(getOrThrow.metadata?.consumedCapacity?.CapacityUnits).toBeDefined()
    expect(getOrThrow.metadata?.consumedCapacity?.TableName).toBeDefined()

    const deleteResponse = await sheepStore.advancedOperations.delete(shaunTheSheep, {
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
  })
  test('update', async () => {
    const sheepStore = (await initialize()).for(SHEEP_ENTITY)
    await sheepStore.put(shaunTheSheep)
    clock.fakeNowIso = '2023-08-01T19:00:00.000Z'
    const updateOne = await sheepStore.advancedOperations.update(shaunIdentifier, {
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
})

describe('unparsedReturnedAttributes', () => {
  test('put', async () => {
    // TODO - delete when we have queries
  })
})

describe('queries-and-scans', () => {
  let sheepStore: SingleEntityAdvancedOperations<Sheep, Pick<Sheep, 'breed'>, Pick<Sheep, 'name'>>

  beforeAll(async () => {
    sheepStore = (await initialize({ allowScans: true })).for(SHEEP_ENTITY).advancedOperations
    await sheepStore.put(shaunTheSheep)
    await sheepStore.put(bobTheSheep)
    await sheepStore.put(alisonTheAlpaca)
  })

  describe('queries', () => {
    test('query one page by pk', async () => {
      const result = await sheepStore.queryOnePageByPk(
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
      const result = await sheepStore.queryAllByPk({ breed: 'merino' }, { returnConsumedCapacity: 'TOTAL' })
      expect(result.items).toEqual([bobTheSheep, shaunTheSheep])
      expect(result.lastEvaluatedKey).toBeUndefined()
      expect(result.metadata?.consumedCapacities?.length).toBeGreaterThan(0)
    })

    test('query all pages by pk and sk', async () => {
      const result = await sheepStore.queryAllByPkAndSk(
        { breed: 'merino' },
        rangeWhereNameBetween('charlie', 'terry'),
        { returnConsumedCapacity: 'TOTAL' }
      )
      expect(result.items).toEqual([shaunTheSheep])
      expect(result.lastEvaluatedKey).toBeUndefined()
      expect(result.metadata?.consumedCapacities?.length).toBeGreaterThan(0)
    })

    test('query one page by pk and sk', async () => {
      const result = await sheepStore.queryOnePageByPkAndSk(
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
  })

  describe('scans', () => {
    test('scan disabled by default', async () => {
      const sheepStoreWithNoScans = (await initialize({ emptyTable: false })).for(SHEEP_ENTITY)
      expect(async () => await sheepStoreWithNoScans.advancedOperations.scanOnePage()).rejects.toThrowError(
        'Scan operations are disabled for this store'
      )
    })

    test('scan with metadata', async () => {
      const result = await sheepStore.scanOnePage({ returnConsumedCapacity: 'TOTAL' })
      expect(result.items).toEqual([alisonTheAlpaca, bobTheSheep, shaunTheSheep])
      expect(result.lastEvaluatedKey).toBeUndefined()
      expect(result.unparsedItems).toBeUndefined()
      expect(result.metadata?.consumedCapacities?.length).toBeGreaterThan(0)
    })

    test('scan all pages with metadata', async () => {
      const result = await sheepStore.scanAll({ returnConsumedCapacity: 'TOTAL' })
      expect(result.items).toEqual([alisonTheAlpaca, bobTheSheep, shaunTheSheep])
      expect(result.unparsedItems).toBeUndefined()
      expect(result.lastEvaluatedKey).toBeUndefined()
      expect(result.metadata?.consumedCapacities?.length).toBeGreaterThan(0)
    })
  })
})

describe('batch operations', () => {
  test('batch puts, gets, deletes', async () => {
    const sheepStore = (await initialize({ allowScans: true })).for(SHEEP_ENTITY)

    const putResult = await sheepStore.advancedOperations.batchPut(
      [shaunTheSheep, bobTheSheep, alisonTheAlpaca],
      {
        batchSize: 2,
        ttl: 1234
      }
    )
    expect(putResult).toEqual({})
    const items = await dynamoDbScanTable(testTableName, docClient)
    expect(items.length).toEqual(3)
    expect(items[0]).toEqual({
      PK: 'SHEEP#BREED#alpaca',
      SK: 'NAME#alison',
      _et: 'sheep',
      _lastUpdated: '2023-07-01T19:00:00.000Z',
      ttl: 1234,
      ...alisonTheAlpaca
    })

    const getResult = await sheepStore.advancedOperations.batchGet(
      [shaunIdentifier, bobIdentifier, alisonIdentifier],
      {
        batchSize: 2
      }
    )
    const batchGetResultItems = getResult.items
    expect(batchGetResultItems).toContainEqual(shaunTheSheep)
    expect(batchGetResultItems).toContainEqual(bobTheSheep)
    expect(batchGetResultItems).toContainEqual(alisonTheAlpaca)
    expect(batchGetResultItems.length).toEqual(3)
    expect(getResult.metadata).toBeUndefined()

    const deleteResult = await sheepStore.advancedOperations.batchDelete(
      [shaunIdentifier, bobIdentifier, alisonIdentifier],
      {
        batchSize: 2
      }
    )
    expect(deleteResult).toEqual({})
    expect((await sheepStore.scanOnePage()).items.length).toEqual(0)
  })

  test('batch operations with metadata', async () => {
    const sheepStore = (await initialize({ allowScans: true })).for(SHEEP_ENTITY)

    const putResult = await sheepStore.advancedOperations.batchPut(
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

    const getResult = await sheepStore.advancedOperations.batchGet(
      [shaunIdentifier, bobIdentifier, alisonIdentifier],
      {
        batchSize: 2,
        returnConsumedCapacity: 'TOTAL'
      }
    )
    expect(getResult.metadata?.consumedCapacities).toBeDefined()

    const deleteResult = await sheepStore.advancedOperations.batchDelete(
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
