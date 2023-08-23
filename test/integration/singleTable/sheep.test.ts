import { beforeAll, describe, expect, test } from 'vitest'
import { rangeWhereNameBetween, Sheep, SHEEP_ENTITY } from '../../examples/sheepTypeAndEntity'
import { customTableName, dynamoDbScanTable, testTableName } from '../testSupportCode/awsEnvironment'
import { SingleEntityOperations } from '../../../src/lib/singleEntityOperations'
import { clock, docClient, initialize } from '../testSupportCode/appEnvironment'
import {
  alisonIdentifier,
  alisonTheAlpaca,
  bobIdentifier,
  bobTheSheep,
  shaunIdentifier,
  shaunTheSheep
} from '../../examples/testData'

describe('basic operations', () => {
  test('put, get, delete', async () => {
    const sheepStore = (await initialize()).for(SHEEP_ENTITY)

    await sheepStore.put(shaunTheSheep)
    const items = await dynamoDbScanTable(testTableName, docClient)
    expect(items.length).toEqual(1)
    expect(items[0]).toEqual({
      PK: 'SHEEP#BREED#merino',
      SK: 'NAME#shaun',
      _et: 'sheep',
      _lastUpdated: '2023-07-01T19:00:00.000Z',
      ...shaunTheSheep
    })

    expect(await sheepStore.getOrUndefined(shaunIdentifier)).toEqual({ item: shaunTheSheep })
    expect(await sheepStore.getOrUndefined(bobIdentifier)).toEqual({})

    expect(await sheepStore.getOrThrow(shaunIdentifier)).toEqual({ item: shaunTheSheep })
    expect(async () => await sheepStore.getOrThrow(bobIdentifier)).rejects.toThrowError(
      'Unable to find item for entity [sheep] with key source {"breed":"merino","name":"bob"}'
    )

    await sheepStore.delete(shaunTheSheep)
    expect((await sheepStore.getOrUndefined({ breed: 'merino', name: 'shaun' })).item).toBeUndefined()
  })

  test('update', async () => {
    const sheepStore = (await initialize()).for(SHEEP_ENTITY)

    await sheepStore.put(shaunTheSheep)
    clock.fakeNowIso = '2023-08-01T19:00:00.000Z'
    await sheepStore.update(shaunIdentifier, {
      update: {
        set: 'ageInYears = :newAge'
      },
      expressionAttributeValues: {
        ':newAge': 4
      }
    })

    expect(await sheepStore.getOrUndefined(shaunIdentifier)).toEqual({
      item: {
        ...shaunTheSheep,
        ageInYears: 4
      }
    })
    const items = await dynamoDbScanTable(testTableName, docClient)
    expect(items.length).toEqual(1)
    expect(items[0]).toEqual({
      PK: 'SHEEP#BREED#merino',
      SK: 'NAME#shaun',
      _et: 'sheep',
      _lastUpdated: '2023-08-01T19:00:00.000Z',
      ...shaunTheSheep,
      ageInYears: 4
    })
  })

  test('push as overwrite', async () => {
    const sheepStore = (await initialize()).for(SHEEP_ENTITY)

    await sheepStore.put(shaunTheSheep)
    clock.fakeNowIso = '2023-08-01T19:00:00.000Z'

    await sheepStore.put({
      ...shaunTheSheep,
      ageInYears: 4
    })
    const items = await dynamoDbScanTable(testTableName, docClient)
    expect(items.length).toEqual(1)
    expect(items[0]).toEqual({
      PK: 'SHEEP#BREED#merino',
      SK: 'NAME#shaun',
      _et: 'sheep',
      _lastUpdated: '2023-08-01T19:00:00.000Z',
      ...shaunTheSheep,
      ageInYears: 4
    })
  })
})

describe('with table customizations', () => {
  async function customSheepStore() {
    return (
      await initialize(
        {},
        {
          tableName: customTableName,
          allowScans: true,
          metaAttributeNames: {
            pk: 'CustomPK',
            sk: 'CustomSK'
          }
        }
      )
    ).for(SHEEP_ENTITY)
  }

  test('put, get, delete', async () => {
    const sheepStore = await customSheepStore()

    await sheepStore.put(shaunTheSheep)
    const items = await dynamoDbScanTable(customTableName, docClient)
    expect(items.length).toEqual(1)
    expect(items[0]).toEqual({
      CustomPK: 'SHEEP#BREED#merino',
      CustomSK: 'NAME#shaun',
      ...shaunTheSheep
    })

    expect(await sheepStore.getOrUndefined(shaunIdentifier)).toEqual({ item: shaunTheSheep })
    await sheepStore.delete(shaunTheSheep)
    expect((await sheepStore.getOrUndefined({ breed: 'merino', name: 'shaun' })).item).toBeUndefined()
  })

  test('update without lastUpdated and other customization', async () => {
    const sheepStore = await customSheepStore()

    await sheepStore.put(shaunTheSheep)
    clock.fakeNowIso = '2023-08-01T19:00:00.000Z'
    await sheepStore.update(shaunIdentifier, {
      update: {
        set: 'ageInYears = :newAge'
      },
      expressionAttributeValues: {
        ':newAge': 4
      }
    })

    const items = await dynamoDbScanTable(customTableName, docClient)
    expect(items.length).toEqual(1)
    expect(items[0]).toEqual({
      CustomPK: 'SHEEP#BREED#merino',
      CustomSK: 'NAME#shaun',
      ...shaunTheSheep,
      ageInYears: 4
    })
  })
})

describe('batch operations', () => {
  test('batch puts, gets, deletes', async () => {
    const sheepStore = (await initialize({ allowScans: true })).for(SHEEP_ENTITY)

    const putResult = await sheepStore.batchPut([shaunTheSheep, bobTheSheep, alisonTheAlpaca], {
      batchSize: 2,
      ttl: 1234
    })
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

    const getResult = await sheepStore.batchGet([shaunIdentifier, bobIdentifier, alisonIdentifier], {
      batchSize: 2
    })
    const batchGetResultItems = getResult.items
    expect(batchGetResultItems).toContainEqual(shaunTheSheep)
    expect(batchGetResultItems).toContainEqual(bobTheSheep)
    expect(batchGetResultItems).toContainEqual(alisonTheAlpaca)
    expect(batchGetResultItems.length).toEqual(3)
    expect(getResult.metadata).toBeUndefined()

    const deleteResult = await sheepStore.batchDelete([shaunIdentifier, bobIdentifier, alisonIdentifier], {
      batchSize: 2
    })
    expect(deleteResult).toEqual({})
    expect((await sheepStore.scan()).items.length).toEqual(0)
  })

  test('batch operations with metadata', async () => {
    const sheepStore = (await initialize({ allowScans: true })).for(SHEEP_ENTITY)

    const putResult = await sheepStore.batchPut([shaunTheSheep, bobTheSheep, alisonTheAlpaca], {
      batchSize: 2,
      ttl: 1234,
      returnConsumedCapacity: 'TOTAL',
      returnItemCollectionMetrics: 'SIZE'
    })
    expect(putResult.metadata?.consumedCapacities).toBeDefined()
    expect(putResult.metadata?.itemCollectionMetricsCollection).toBeDefined()

    const getResult = await sheepStore.batchGet([shaunIdentifier, bobIdentifier, alisonIdentifier], {
      batchSize: 2,
      returnConsumedCapacity: 'TOTAL'
    })
    expect(getResult.metadata?.consumedCapacities).toBeDefined()

    const deleteResult = await sheepStore.batchDelete([shaunIdentifier, bobIdentifier, alisonIdentifier], {
      batchSize: 2,
      returnConsumedCapacity: 'TOTAL',
      returnItemCollectionMetrics: 'SIZE'
    })
    expect(deleteResult.metadata?.consumedCapacities).toBeDefined()
    expect(deleteResult.metadata?.itemCollectionMetricsCollection).toBeDefined()
  })
})

describe('conditionals', () => {
  test('simple put condition', async () => {
    const sheepStore = (await initialize()).for(SHEEP_ENTITY)
    // Valid condition should be successful
    // TODO eventually - at some point we'll want to use expression attribute names here too?
    await sheepStore.put(shaunTheSheep, { conditionExpression: 'attribute_not_exists(PK)' })
    // Invalid condition should fail
    expect(
      async () => await sheepStore.put(shaunTheSheep, { conditionExpression: 'attribute_not_exists(PK)' })
    ).rejects.toThrowError('The conditional request failed')
  })

  test('complex put condition', async () => {
    const sheepStore = (await initialize()).for(SHEEP_ENTITY)
    // Valid condition should be successful
    await sheepStore.put(shaunTheSheep, {
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
        await sheepStore.put(shaunTheSheep, {
          conditionExpression: 'NOT #name = :invalidname',
          expressionAttributeNames: {
            '#name': 'name'
          },
          expressionAttributeValues: {
            ':invalidname': 'shaun'
          }
        })
    ).rejects.toThrowError('The conditional request failed')
  })

  test('update', async () => {
    const sheepStore = (await initialize()).for(SHEEP_ENTITY)

    await sheepStore.put(shaunTheSheep)
    expect(
      async () =>
        await sheepStore.update(shaunIdentifier, {
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
  })

  test('delete', async () => {
    const sheepStore = (await initialize()).for(SHEEP_ENTITY)

    expect(
      async () =>
        await sheepStore.delete(shaunIdentifier, {
          conditionExpression: 'attribute_exists(PK)'
        })
    ).rejects.toThrowError('The conditional request failed')
  })
})

describe('queries-and-scans', () => {
  let sheepStore: SingleEntityOperations<Sheep, Pick<Sheep, 'breed'>, Pick<Sheep, 'name'>>
  beforeAll(async () => {
    sheepStore = (await initialize({ allowScans: true })).for(SHEEP_ENTITY)
    await sheepStore.put(shaunTheSheep)
    await sheepStore.put(bobTheSheep)
    await sheepStore.put(alisonTheAlpaca)
  })

  describe('queries', () => {
    test('query', async () => {
      const result = await sheepStore.query().byPk({ breed: 'merino' })
      expect(result.items).toEqual([bobTheSheep, shaunTheSheep])
      expect(result.lastEvaluatedKey).toBeUndefined()
      expect(result.metadata).toBeUndefined()
    })

    test('query-with-metadata', async () => {
      const result = await sheepStore.query({ returnConsumedCapacity: 'TOTAL' }).byPk({ breed: 'merino' })
      expect(result.items).toEqual([bobTheSheep, shaunTheSheep])
      expect(result.lastEvaluatedKey).toBeUndefined()
      expect(result.metadata?.consumedCapacities?.length).toBeGreaterThan(0)
    })

    test('query all pages', async () => {
      const result = await sheepStore.query({ allPages: true }).byPk({ breed: 'merino' })
      expect(result.items).toEqual([bobTheSheep, shaunTheSheep])
      expect(result.lastEvaluatedKey).toBeUndefined()
      expect(result.metadata).toBeUndefined()
    })

    test('query all pages with metadata', async () => {
      const result = await sheepStore
        .query({ allPages: true, returnConsumedCapacity: 'TOTAL' })
        .byPk({ breed: 'merino' })
      expect(result.items).toEqual([bobTheSheep, shaunTheSheep])
      expect(result.lastEvaluatedKey).toBeUndefined()
      expect(result.metadata?.consumedCapacities?.length).toBeGreaterThan(0)
    })

    test('query with limit', async () => {
      const result = await sheepStore.query({ limit: 1 }).byPk({ breed: 'merino' })
      // We set limit to 1, so we should only get 1 item - which one is defined by the SK, and "bob" comes before, "shaun"
      expect(result.items).toEqual([bobTheSheep])
      expect(result.lastEvaluatedKey).toEqual({
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#bob'
      })
      const secondResult = await sheepStore
        .query({ limit: 1, exclusiveStartKey: result.lastEvaluatedKey })
        .byPk({ breed: 'merino' })
      expect(secondResult.items).toEqual([shaunTheSheep])
    })

    test('query backwards', async () => {
      const sheepStore = (await initialize()).for(SHEEP_ENTITY)
      await sheepStore.put(shaunTheSheep)
      await sheepStore.put(bobTheSheep)
      await sheepStore.put(alisonTheAlpaca)
      // scanIndexForward is false, so we get the LAST result, according to DynamoDB ordering
      expect(
        (await sheepStore.query({ limit: 1, scanIndexForward: false }).byPk({ breed: 'merino' })).items
      ).toEqual([shaunTheSheep])
    })

    test('querySkRange', async () => {
      const result = await sheepStore
        .query({})
        .byPkAndSk({ breed: 'merino' }, rangeWhereNameBetween('charlie', 'terry'))
      expect(result.items).toEqual([shaunTheSheep])
      expect(result.lastEvaluatedKey).toBeUndefined()
    })
  })

  describe('scans', () => {
    test('scan disabled by default', async () => {
      const sheepStoreWithNoScans = (await initialize({ emptyTable: false })).for(SHEEP_ENTITY)
      expect(async () => await sheepStoreWithNoScans.scan()).rejects.toThrowError(
        'Scan operations are disabled for this store'
      )
    })

    test('scan', async () => {
      const result = await sheepStore.scan()
      expect(result.items).toEqual([alisonTheAlpaca, bobTheSheep, shaunTheSheep])
      expect(result.unparsedItems).toBeUndefined()
      expect(result.lastEvaluatedKey).toBeUndefined()
      expect(result.metadata).toBeUndefined()
    })

    test('scan with metadata', async () => {
      const result = await sheepStore.scan({ returnConsumedCapacity: 'TOTAL' })
      expect(result.items).toEqual([alisonTheAlpaca, bobTheSheep, shaunTheSheep])
      expect(result.unparsedItems).toBeUndefined()
      expect(result.lastEvaluatedKey).toBeUndefined()
      expect(result.metadata?.consumedCapacities?.length).toBeGreaterThan(0)
    })

    test('scan all pages', async () => {
      const result = await sheepStore.scan({ allPages: true })
      expect(result.items).toEqual([alisonTheAlpaca, bobTheSheep, shaunTheSheep])
      expect(result.unparsedItems).toBeUndefined()
      expect(result.lastEvaluatedKey).toBeUndefined()
      expect(result.metadata).toBeUndefined()
    })

    test('scan all pages with metadata', async () => {
      const result = await sheepStore.scan({ allPages: true, returnConsumedCapacity: 'TOTAL' })
      expect(result.items).toEqual([alisonTheAlpaca, bobTheSheep, shaunTheSheep])
      expect(result.unparsedItems).toBeUndefined()
      expect(result.lastEvaluatedKey).toBeUndefined()
      expect(result.metadata?.consumedCapacities?.length).toBeGreaterThan(0)
    })

    test('scan with limit', async () => {
      const result = await sheepStore.scan({ limit: 2 })
      // expect(sheep).toContainEqual(shaunTheSheep)
      // We set limit to 2, so we should only get 2 items - which ones are defined by dynamodb ordering
      expect(result.items).toEqual([alisonTheAlpaca, bobTheSheep])
      expect(result.metadata).toBeUndefined()
      expect(result.lastEvaluatedKey).toEqual({
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#bob'
      })

      const secondResult = await sheepStore.scan({ limit: 2, exclusiveStartKey: result.lastEvaluatedKey })
      expect(secondResult.items).toEqual([shaunTheSheep])
      expect(secondResult.lastEvaluatedKey).toBeUndefined()
      expect(secondResult.metadata).toBeUndefined()
    })
  })
})

describe('metadata', () => {
  test('put, get, delete', async () => {
    const sheepStore = (await initialize()).for(SHEEP_ENTITY)

    const putResponse = await sheepStore.put(shaunTheSheep, {
      returnConsumedCapacity: 'TOTAL',
      returnItemCollectionMetrics: 'SIZE'
    })
    expect(putResponse.metadata?.consumedCapacity?.CapacityUnits).toBeDefined()
    // TODO eventually - test putResponse.metadata?.itemCollectionMetrics - requires an example with a collection in item

    const getOrUndefined = await sheepStore.getOrUndefined(shaunIdentifier, {
      returnConsumedCapacity: 'TOTAL'
    })
    expect(getOrUndefined.metadata?.consumedCapacity?.CapacityUnits).toBeDefined()
    expect(getOrUndefined.metadata?.consumedCapacity?.TableName).toBeDefined()

    const getOrThrow = await sheepStore.getOrThrow(shaunIdentifier, {
      returnConsumedCapacity: 'TOTAL'
    })
    expect(getOrThrow.metadata?.consumedCapacity?.CapacityUnits).toBeDefined()
    expect(getOrThrow.metadata?.consumedCapacity?.TableName).toBeDefined()

    const result = await sheepStore.delete(shaunTheSheep, { returnConsumedCapacity: 'TOTAL' })
    expect(result.metadata?.consumedCapacity?.CapacityUnits).toBeDefined()
  })
})

describe('unparsedReturnedAttributes', () => {
  test('put', async () => {
    const sheepStore = (await initialize()).for(SHEEP_ENTITY)
    await sheepStore.put(shaunTheSheep)

    const secondPut = await sheepStore.put({ ...shaunTheSheep, ageInYears: 11 }, { returnValues: 'ALL_OLD' })
    expect(secondPut.unparsedReturnedAttributes).toEqual({
      PK: 'SHEEP#BREED#merino',
      SK: 'NAME#shaun',
      _et: 'sheep',
      _lastUpdated: '2023-07-01T19:00:00.000Z',
      ageInYears: 3,
      breed: 'merino',
      name: 'shaun'
    })

    const thirdPut = await sheepStore.put({ ...shaunTheSheep, ageInYears: 21 })
    expect(thirdPut).toEqual({})

    expect(
      async () =>
        await sheepStore.put(
          { ...shaunTheSheep, ageInYears: 31 },
          { conditionExpression: 'attribute_not_exists(PK)' }
        )
    ).rejects.toThrowError('The conditional request failed')

    // The actual attributes from the existing record in the table are available in the 'Item' field of the error
    // This is just the error generated in the AWS SDK
    expect(
      async () =>
        await sheepStore.put(
          { ...shaunTheSheep, ageInYears: 31 },
          { conditionExpression: 'attribute_not_exists(PK)', returnValuesOnConditionCheckFailure: 'ALL_OLD' }
        )
    ).rejects.toThrowError('The conditional request failed')
  })
})
