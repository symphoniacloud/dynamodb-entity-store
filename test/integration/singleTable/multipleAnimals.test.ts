import { describe, expect, test } from 'vitest'
import { SHEEP_ENTITY } from '../../examples/sheepTypeAndEntity'
import { CHICKEN_ENTITY } from '../../examples/chickenTypeAndEntity'
import { dynamoDbScanTable, testTableName } from '../testSupportCode/awsEnvironment'
import { docClient, initialize } from '../testSupportCode/appEnvironment'
import {
  alisonIdentifier,
  bobIdentifier,
  bobTheSheep,
  chesterDog,
  ginger,
  gingerIdentifier,
  peggyCat,
  shaunIdentifier,
  shaunTheSheep,
  waddles
} from '../../examples/testData'
import { DUCK_ENTITY } from '../../examples/duckTypeAndEntity'
import { DOG_ENTITY } from '../../examples/dogTypeAndEntity'
import { CAT_ENTITY } from '../../examples/catTypeAndEntity'

describe('query', () => {
  test('query multiple entities in one query', async () => {
    const store = await initialize()
    await store.for(DUCK_ENTITY).put(waddles)
    await store.for(CHICKEN_ENTITY).put(ginger)

    const queryResult = await store
      .forMultiple([DUCK_ENTITY, CHICKEN_ENTITY])
      .queryWithGsi(DUCK_ENTITY)
      .byPk({ coop: 'bristol' })
    const chickensAndDucks = queryResult.itemsByEntityType

    expect(chickensAndDucks['chicken'].length).toEqual(1)
    expect(chickensAndDucks['chicken'][0]).toEqual(ginger)
    expect(chickensAndDucks['duck'].length).toEqual(1)
    expect(chickensAndDucks['duck'][0]).toEqual(waddles)
    expect(queryResult.unparsedItems).toBeUndefined()
  })

  test('query table single entity where multiple returned from table', async () => {
    const store = await initialize()
    await store.for(DOG_ENTITY).put(chesterDog)
    await store.for(CAT_ENTITY).put(peggyCat)

    const queryResult = await store
      .for(DOG_ENTITY)
      .advancedOperations.queryAllByPk({ farm: 'Sunflower Farm' })
    expect(queryResult.items).toEqual([chesterDog])
    expect(queryResult.unparsedItems?.length).toEqual(1)
    expect(queryResult.unparsedItems?.[0]).toEqual({
      PK: 'FARM#Sunflower Farm',
      SK: 'CAT#NAME#Peggy',
      _et: 'cat',
      _lastUpdated: '2023-07-01T19:00:00.000Z',
      ageInYears: 7,
      farm: 'Sunflower Farm',
      name: 'Peggy'
    })
  })

  test('query table single entity with multiple entity api where multiple returned from table', async () => {
    const store = await initialize()
    await store.for(DOG_ENTITY).put(chesterDog)
    await store.for(CAT_ENTITY).put(peggyCat)

    const queryResult = await store
      .forMultiple([DOG_ENTITY])
      .query(DOG_ENTITY)
      .byPk({ farm: 'Sunflower Farm' })
    expect(queryResult.itemsByEntityType['dog'].length).toEqual(1)
    expect(queryResult.itemsByEntityType['dog'][0]).toEqual(chesterDog)
    expect(queryResult.unparsedItems?.length).toEqual(1)
    expect(queryResult.unparsedItems?.[0]).toEqual({
      PK: 'FARM#Sunflower Farm',
      SK: 'CAT#NAME#Peggy',
      _et: 'cat',
      _lastUpdated: '2023-07-01T19:00:00.000Z',
      ageInYears: 7,
      farm: 'Sunflower Farm',
      name: 'Peggy'
    })
  })

  test('query GSI single entity where multiple returned from table', async () => {
    const store = await initialize()
    await store.for(DUCK_ENTITY).put(waddles)
    await store.for(CHICKEN_ENTITY).put(ginger)

    const result = await store.for(DUCK_ENTITY).advancedOperations.queryAllWithGsiByPk({ coop: 'bristol' })
    expect(result.items).toEqual([waddles])
    expect(result.unparsedItems?.length).toEqual(1)
    expect(result.unparsedItems?.[0]).toEqual({
      PK: 'CHICKEN#BREED#sussex',
      SK: 'DATEOFBIRTH#2021-07-01#NAME#ginger',
      GSIPK: 'COOP#bristol',
      GSISK: 'CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01',
      _et: 'chicken',
      _lastUpdated: '2023-07-01T19:00:00.000Z',
      ...ginger
    })
  })

  test('query GSI single entity with multiple entity api where multiple returned from table', async () => {
    const store = await initialize()
    await store.for(DUCK_ENTITY).put(waddles)
    await store.for(CHICKEN_ENTITY).put(ginger)

    const queryResult = await store
      .forMultiple([DUCK_ENTITY])
      .queryWithGsi(DUCK_ENTITY)
      .byPk({ coop: 'bristol' })
    expect(queryResult.itemsByEntityType['duck'].length).toEqual(1)
    expect(queryResult.itemsByEntityType['duck'][0]).toEqual(waddles)
    expect(queryResult.itemsByEntityType['chicken']).toBeUndefined()
    expect(queryResult.unparsedItems?.length).toEqual(1)
    expect(queryResult.unparsedItems?.[0]).toEqual({
      PK: 'CHICKEN#BREED#sussex',
      SK: 'DATEOFBIRTH#2021-07-01#NAME#ginger',
      GSIPK: 'COOP#bristol',
      GSISK: 'CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01',
      _et: 'chicken',
      _lastUpdated: '2023-07-01T19:00:00.000Z',
      ...ginger
    })
  })
})

describe('scan', () => {
  test('scan multiple entities in one scan', async () => {
    const store = await initialize({ allowScans: true })
    await store.for(SHEEP_ENTITY).put(shaunTheSheep)
    await store.for(CHICKEN_ENTITY).put(ginger)

    const scanResult = await store.forMultiple([SHEEP_ENTITY, CHICKEN_ENTITY]).scan()
    const sheepAndChickens = scanResult.itemsByEntityType
    expect(sheepAndChickens['sheep'].length).toEqual(1)
    expect(sheepAndChickens['sheep'][0]).toEqual(shaunTheSheep)
    expect(sheepAndChickens['chicken'].length).toEqual(1)
    expect(sheepAndChickens['chicken'][0]).toEqual(ginger)
    expect(scanResult.unparsedItems).toBeUndefined()
  })

  test('scan single entity where multiple returned from table', async () => {
    const store = await initialize({ allowScans: true })
    await store.for(SHEEP_ENTITY).put(shaunTheSheep)
    await store.for(CHICKEN_ENTITY).put(ginger)

    const scanResult = await store.for(SHEEP_ENTITY).advancedOperations.scanOnePage()
    expect(scanResult.items.length).toEqual(1)
    expect(scanResult.items[0]).toEqual(shaunTheSheep)
    expect(scanResult.unparsedItems?.length).toEqual(1)
    expect(scanResult.unparsedItems?.[0]).toEqual({
      PK: 'CHICKEN#BREED#sussex',
      SK: 'DATEOFBIRTH#2021-07-01#NAME#ginger',
      GSIPK: 'COOP#bristol',
      GSISK: 'CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01',
      _et: 'chicken',
      _lastUpdated: '2023-07-01T19:00:00.000Z',
      ...ginger
    })
  })

  test('scan single entity with multiple entity api where multiple returned from table', async () => {
    const store = await initialize({ allowScans: true })
    await store.for(SHEEP_ENTITY).put(shaunTheSheep)
    await store.for(CHICKEN_ENTITY).put(ginger)

    const scanResult = await store.forMultiple([SHEEP_ENTITY]).scan()
    expect(scanResult.itemsByEntityType['sheep'][0]).toEqual(shaunTheSheep)
    expect(scanResult.itemsByEntityType['chickens']).toBeUndefined()
    expect(scanResult.unparsedItems?.length).toEqual(1)
    expect(scanResult.unparsedItems?.[0]).toEqual({
      PK: 'CHICKEN#BREED#sussex',
      SK: 'DATEOFBIRTH#2021-07-01#NAME#ginger',
      GSIPK: 'COOP#bristol',
      GSISK: 'CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01',
      _et: 'chicken',
      _lastUpdated: '2023-07-01T19:00:00.000Z',
      ...ginger
    })
  })
})

describe('transactional write', () => {
  test('puts', async () => {
    const store = await initialize({ allowScans: true })
    await store.transactions
      .buildWriteTransaction(SHEEP_ENTITY)
      .put(shaunTheSheep)
      .put(bobTheSheep)
      .nextEntity(CHICKEN_ENTITY)
      .put(ginger)
      .execute()

    const items = await dynamoDbScanTable(testTableName, docClient)
    expect(items.length).toEqual(3)
    expect(items[0]).toEqual({
      PK: 'CHICKEN#BREED#sussex',
      SK: 'DATEOFBIRTH#2021-07-01#NAME#ginger',
      GSIPK: 'COOP#bristol',
      GSISK: 'CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01',
      _et: 'chicken',
      _lastUpdated: '2023-07-01T19:00:00.000Z',
      ...ginger
    })
    expect(items[2]).toEqual({
      PK: 'SHEEP#BREED#merino',
      SK: 'NAME#shaun',
      _et: 'sheep',
      _lastUpdated: '2023-07-01T19:00:00.000Z',
      ...shaunTheSheep,
      ageInYears: 3
    })
  })

  test('puts and deletes', async () => {
    const store = await initialize({ allowScans: true })
    await store.for(SHEEP_ENTITY).put(shaunTheSheep)
    const items = await dynamoDbScanTable(testTableName, docClient)
    expect(items.length).toEqual(1)
    expect(items[0]).toEqual({
      PK: 'SHEEP#BREED#merino',
      SK: 'NAME#shaun',
      _et: 'sheep',
      _lastUpdated: '2023-07-01T19:00:00.000Z',
      ...shaunTheSheep,
      ageInYears: 3
    })

    await store.transactions
      .buildWriteTransaction(SHEEP_ENTITY)
      .delete(shaunTheSheep)
      .nextEntity(CHICKEN_ENTITY)
      .put(ginger)
      .execute()

    const nextItems = await dynamoDbScanTable(testTableName, docClient)
    expect(nextItems.length).toEqual(1)
    expect(nextItems[0]).toEqual({
      PK: 'CHICKEN#BREED#sussex',
      SK: 'DATEOFBIRTH#2021-07-01#NAME#ginger',
      GSIPK: 'COOP#bristol',
      GSISK: 'CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01',
      _et: 'chicken',
      _lastUpdated: '2023-07-01T19:00:00.000Z',
      ...ginger
    })
  })

  // TODO - need test for conditionCheck
})

describe('transactional gets', () => {
  test('get', async () => {
    const store = await initialize({ allowScans: true })
    await store.for(SHEEP_ENTITY).put(shaunTheSheep)
    await store.for(SHEEP_ENTITY).put(bobTheSheep)
    await store.for(CHICKEN_ENTITY).put(ginger)

    const results = await store.transactions
      .buildGetTransaction(SHEEP_ENTITY)
      .get(shaunIdentifier)
      .get(alisonIdentifier)
      .get(bobIdentifier)
      .nextEntity(CHICKEN_ENTITY)
      .get(gingerIdentifier)
      .execute()

    expect(results.itemsByEntityType).toEqual({
      sheep: [shaunTheSheep, null, bobTheSheep],
      chicken: [ginger]
    })

    const resultsWithMetadata = await store.transactions
      .buildGetTransaction(SHEEP_ENTITY)
      .get(shaunIdentifier)
      .execute({ returnConsumedCapacity: 'TOTAL' })

    expect(resultsWithMetadata.metadata?.consumedCapacity).toBeDefined()
  })
})
