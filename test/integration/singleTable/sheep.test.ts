import { beforeAll, describe, expect, test } from 'vitest'
import { rangeWhereNameBetween, Sheep, SHEEP_ENTITY } from '../../examples/sheepTypeAndEntity'
import { customTableName, dynamoDbScanTable, testTableName } from '../testSupportCode/awsEnvironment'
import { SingleEntityOperations } from '../../../src/lib'
import { clock, docClient, initialize } from '../testSupportCode/appEnvironment'
import {
  alisonTheAlpaca,
  bobIdentifier,
  bobTheSheep,
  shaunIdentifier,
  shaunTheSheep
} from '../../examples/testData'

describe('basic operations', () => {
  test('put, get, delete', async () => {
    const sheepStore = (await initialize()).for(SHEEP_ENTITY)

    expect(await sheepStore.put(shaunTheSheep)).toEqual(shaunTheSheep)
    const items = await dynamoDbScanTable(testTableName, docClient)
    expect(items.length).toEqual(1)
    expect(items[0]).toEqual({
      PK: 'SHEEP#BREED#merino',
      SK: 'NAME#shaun',
      _et: 'sheep',
      _lastUpdated: '2023-07-01T19:00:00.000Z',
      ...shaunTheSheep
    })

    expect(await sheepStore.getOrUndefined(shaunIdentifier)).toEqual(shaunTheSheep)
    expect(await sheepStore.getOrUndefined(bobIdentifier)).toEqual(undefined)

    expect(await sheepStore.getOrThrow(shaunIdentifier)).toEqual(shaunTheSheep)
    expect(async () => await sheepStore.getOrThrow(bobIdentifier)).rejects.toThrowError(
      'Unable to find item for entity [sheep] with key source {"breed":"merino","name":"bob"}'
    )

    await sheepStore.delete(shaunTheSheep)
    expect(await sheepStore.getOrUndefined({ breed: 'merino', name: 'shaun' })).toBeUndefined()
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
      await initialize({
        allowScans: true,
        useCustomTable: true
      })
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

    expect(await sheepStore.getOrUndefined(shaunIdentifier)).toEqual(shaunTheSheep)
    await sheepStore.delete(shaunTheSheep)
    expect(await sheepStore.getOrUndefined({ breed: 'merino', name: 'shaun' })).toBeUndefined()
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
    test('query one page by PK', async () => {
      const result = await sheepStore.queryOnePageByPk({ breed: 'merino' })
      expect(result.items).toEqual([bobTheSheep, shaunTheSheep])
      expect(result.lastEvaluatedKey).toBeUndefined()
    })

    test('query all pages by PK', async () => {
      const result = await sheepStore.queryAllByPk({ breed: 'merino' })
      expect(result).toEqual([bobTheSheep, shaunTheSheep])

      const resultBackwards = await sheepStore.queryAllByPk({ breed: 'merino' }, { scanIndexForward: false })
      expect(resultBackwards).toEqual([shaunTheSheep, bobTheSheep])
    })

    test('query with limit', async () => {
      const result = await sheepStore.queryOnePageByPk({ breed: 'merino' }, { limit: 1 })
      // We set limit to 1, so we should only get 1 item - which one is defined by the SK, and "bob" comes before, "shaun"
      expect(result.items).toEqual([bobTheSheep])
      expect(result.lastEvaluatedKey).toEqual({
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#bob'
      })
      const secondResult = await sheepStore.queryOnePageByPk(
        { breed: 'merino' },
        { limit: 1, exclusiveStartKey: result.lastEvaluatedKey }
      )
      expect(secondResult.items).toEqual([shaunTheSheep])
    })

    test('query backwards', async () => {
      // // scanIndexForward is false, so we get the LAST result, according to DynamoDB ordering
      expect(
        (await sheepStore.queryOnePageByPk({ breed: 'merino' }, { limit: 1, scanIndexForward: false })).items
      ).toEqual([shaunTheSheep])
    })

    test('query all pages by pk and sk', async () => {
      const result = await sheepStore.queryAllByPkAndSk(
        { breed: 'merino' },
        rangeWhereNameBetween('charlie', 'terry')
      )
      expect(result).toEqual([shaunTheSheep])
    })

    test('query one page by pk and sk', async () => {
      const result = await sheepStore.queryOnePageByPkAndSk(
        { breed: 'merino' },
        rangeWhereNameBetween('charlie', 'terry')
      )
      expect(result.items).toEqual([shaunTheSheep])
      expect(result.lastEvaluatedKey).toBeUndefined()
    })
  })

  describe('scans', () => {
    test('scan disabled by default', async () => {
      const sheepStoreWithNoScans = (await initialize({ emptyTable: false })).for(SHEEP_ENTITY)
      expect(async () => await sheepStoreWithNoScans.scanOnePage()).rejects.toThrowError(
        'Scan operations are disabled for this store'
      )
    })

    test('scan one page', async () => {
      const result = await sheepStore.scanOnePage()
      expect(result.items).toEqual([alisonTheAlpaca, bobTheSheep, shaunTheSheep])
      expect(result.lastEvaluatedKey).toBeUndefined()
    })

    test('scan all pages', async () => {
      const result = await sheepStore.scanAll()
      expect(result).toEqual([alisonTheAlpaca, bobTheSheep, shaunTheSheep])
    })

    test('scan with limit', async () => {
      const result = await sheepStore.scanOnePage({ limit: 2 })
      // We set limit to 2, so we should only get 2 items - which ones are defined by dynamodb ordering
      expect(result.items).toEqual([alisonTheAlpaca, bobTheSheep])
      expect(result.lastEvaluatedKey).toEqual({
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#bob'
      })

      const secondResult = await sheepStore.scanOnePage({
        limit: 2,
        exclusiveStartKey: result.lastEvaluatedKey
      })
      expect(secondResult.items).toEqual([shaunTheSheep])
      expect(secondResult.lastEvaluatedKey).toBeUndefined()
    })
  })
})
