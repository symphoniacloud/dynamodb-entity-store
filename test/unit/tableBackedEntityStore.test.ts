import { expect, test } from 'vitest'
import { SHEEP_ENTITY } from '../examples/sheepTypeAndEntity'
import { fakeDynamoDBInterface } from './fakes/fakeDynamoDBInterface'
import { FakeClock } from './fakes/fakeClock'
import { createStandardSingleTableStoreConfig } from '../../src/lib/support/configSupport'
import { createStore } from '../../src/lib/tableBackedStore'

const METADATA = { $metadata: {} }

const UNIT_TEST_TABLE = 'unit-test-table'

function wrapperAndStore({ allowScans = false }: { allowScans?: boolean } = {}) {
  const wrapper = fakeDynamoDBInterface()

  const storeConfig = createStandardSingleTableStoreConfig(
    UNIT_TEST_TABLE,
    {
      globalDynamoDB: wrapper,
      clock: new FakeClock()
    },
    {
      allowScans
    }
  )

  const store = createStore(storeConfig)
  return {
    wrapper,
    store
  }
}

const shaunIdentifier = { breed: 'merino', name: 'shaun' }
const shaunTheSheep = { ...shaunIdentifier, ageInYears: 3 }
const shaunRecord = { ...shaunTheSheep, PK: 'SHEEP#BREED#merino', SK: 'NAME#shaun', _et: 'sheep' }
const bobIdentifier = { breed: 'merino', name: 'bob' }
const bobTheSheep = { ...bobIdentifier, ageInYears: 4 }
const bobRecord = { ...bobTheSheep, PK: 'SHEEP#BREED#merino', SK: 'NAME#bob', _et: 'sheep' }

test('put', async () => {
  const { wrapper, store } = wrapperAndStore()
  expect(await store.for(SHEEP_ENTITY).put(shaunTheSheep)).toEqual(shaunTheSheep)

  expect(wrapper.puts.length).toEqual(1)
  expect(wrapper.puts[0]).toEqual({
    TableName: UNIT_TEST_TABLE,
    Item: {
      ...shaunRecord,
      _lastUpdated: '2023-07-01T19:00:00.000Z'
    }
  })
})

test('putWithConditions', async () => {
  const { wrapper, store } = wrapperAndStore()
  expect(
    await store.for(SHEEP_ENTITY).put(shaunTheSheep, {
      conditionExpression: 'NOT #name = :invalidname',
      expressionAttributeNames: {
        '#name': 'name'
      },
      expressionAttributeValues: {
        ':invalidname': 'shaun'
      }
    })
  ).toEqual(shaunTheSheep)

  expect(wrapper.puts.length).toEqual(1)
  expect(wrapper.puts[0]).toEqual({
    TableName: UNIT_TEST_TABLE,
    Item: {
      ...shaunRecord,
      _lastUpdated: '2023-07-01T19:00:00.000Z'
    },
    ConditionExpression: 'NOT #name = :invalidname',
    ExpressionAttributeNames: {
      '#name': 'name'
    },
    ExpressionAttributeValues: {
      ':invalidname': 'shaun'
    }
  })
})

test('getOrUndefined', async () => {
  const { wrapper, store } = wrapperAndStore()
  wrapper.stubGets.addResponse(
    {
      TableName: UNIT_TEST_TABLE,
      Key: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      }
    },
    {
      Item: shaunRecord,
      ...METADATA
    }
  )

  const storeForSheep = store.for(SHEEP_ENTITY)

  expect(await storeForSheep.getOrUndefined(shaunIdentifier)).toEqual(shaunTheSheep)
  expect(
    await storeForSheep.getOrUndefined({
      ...shaunIdentifier,
      attributeNotUsedInIdentifier: 'unused'
    })
  ).toEqual(shaunTheSheep)
  expect(await storeForSheep.getOrUndefined(bobIdentifier)).toBeUndefined()
})

test('getOrThrow', async () => {
  const { wrapper, store } = wrapperAndStore()
  wrapper.stubGets.addResponse(
    {
      TableName: UNIT_TEST_TABLE,
      Key: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      }
    },
    {
      Item: shaunRecord,
      ...METADATA
    }
  )

  const storeForSheep = store.for(SHEEP_ENTITY)

  expect(await storeForSheep.getOrThrow(shaunIdentifier)).toEqual(shaunTheSheep)
  expect(async () => await storeForSheep.getOrThrow(bobIdentifier)).rejects.toThrowError(
    'Unable to find item for entity [sheep] with key source {"breed":"merino","name":"bob"}'
  )
})

test('delete', async () => {
  const { wrapper, store } = wrapperAndStore()
  await store.for(SHEEP_ENTITY).delete(shaunTheSheep)

  expect(wrapper.deletes.length).toEqual(1)
  expect(wrapper.deletes[0]).toEqual({
    TableName: UNIT_TEST_TABLE,
    Key: {
      PK: 'SHEEP#BREED#merino',
      SK: 'NAME#shaun'
    }
  })
})

test('queryOnePageByPk', async () => {
  const { wrapper, store } = wrapperAndStore()
  wrapper.stubOnePageQueries.addResponse(
    {
      TableName: UNIT_TEST_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'SHEEP#BREED#merino' }
    },
    {
      Items: [shaunRecord, bobRecord],
      ...METADATA
    }
  )
  expect(await store.for(SHEEP_ENTITY).queryOnePageByPk({ breed: 'merino' })).toEqual({
    items: [shaunTheSheep, bobTheSheep]
  })
})

test('queryAllByPk', async () => {
  const { wrapper, store } = wrapperAndStore()
  wrapper.stubAllPagesQueries.addResponse(
    {
      TableName: UNIT_TEST_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'SHEEP#BREED#merino' }
    },
    [{ Items: [shaunRecord, bobRecord], ...METADATA }]
  )

  expect(await store.for(SHEEP_ENTITY).queryAllByPk({ breed: 'merino' })).toEqual([
    shaunTheSheep,
    bobTheSheep
  ])
})

test('queryOnePageByPkWithLimit', async () => {
  const { wrapper, store } = wrapperAndStore()
  wrapper.stubOnePageQueries.addResponse(
    {
      TableName: UNIT_TEST_TABLE,
      Limit: 5,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'SHEEP#BREED#merino' }
    },
    {
      Items: [shaunRecord, bobRecord],
      ...METADATA
    }
  )
  expect(await store.for(SHEEP_ENTITY).queryOnePageByPk({ breed: 'merino' }, { limit: 5 })).toEqual({
    items: [shaunTheSheep, bobTheSheep]
  })
})

test('queryOnePageByPkWithExclusiveStartKey', async () => {
  const { wrapper, store } = wrapperAndStore()
  wrapper.stubOnePageQueries.addResponse(
    {
      TableName: UNIT_TEST_TABLE,
      ExclusiveStartKey: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'SHEEP#BREED#merino' }
    },
    {
      Items: [shaunRecord, bobRecord],
      ...METADATA
    }
  )
  expect(
    await store.for(SHEEP_ENTITY).queryOnePageByPk(
      { breed: 'merino' },
      {
        exclusiveStartKey: {
          PK: 'SHEEP#BREED#merino',
          SK: 'NAME#shaun'
        }
      }
    )
  ).toEqual({
    items: [shaunTheSheep, bobTheSheep]
  })
})

test('queryOnePageByPkWithExclusiveStartKeyAndLimit', async () => {
  const { wrapper, store } = wrapperAndStore()
  wrapper.stubOnePageQueries.addResponse(
    {
      TableName: UNIT_TEST_TABLE,
      Limit: 5,
      ExclusiveStartKey: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'SHEEP#BREED#merino' }
    },
    {
      Items: [shaunRecord, bobRecord],
      ...METADATA
    }
  )
  expect(
    await store.for(SHEEP_ENTITY).queryOnePageByPk(
      { breed: 'merino' },
      {
        limit: 5,
        exclusiveStartKey: {
          PK: 'SHEEP#BREED#merino',
          SK: 'NAME#shaun'
        }
      }
    )
  ).toEqual({
    items: [shaunTheSheep, bobTheSheep]
  })
})

test('queryBySkRange', async () => {
  const { wrapper, store } = wrapperAndStore()
  wrapper.stubOnePageQueries.addResponse(
    {
      TableName: UNIT_TEST_TABLE,
      KeyConditionExpression: 'PK = :pk and SK > :sk',
      ExpressionAttributeNames: { '#sk': 'SK' },
      ExpressionAttributeValues: { ':pk': 'SHEEP#BREED#merino', ':sk': 'NAME#charlie' }
    },
    {
      Items: [shaunRecord],
      ...METADATA
    }
  )
  expect(
    await store.for(SHEEP_ENTITY).queryOnePageByPkAndSk(
      { breed: 'merino' },
      {
        skConditionExpressionClause: 'SK > :sk',
        expressionAttributeValues: {
          ':sk': 'NAME#charlie'
        }
      }
    )
  ).toEqual({
    items: [shaunTheSheep]
  })
})

test('dontAllowScansIfDisabled', async () => {
  const { store } = wrapperAndStore()
  expect(async () => await store.for(SHEEP_ENTITY).scanOnePage()).rejects.toThrowError(
    'Scan operations are disabled for this store'
  )
})

test('scanOnePage', async () => {
  const { wrapper, store } = wrapperAndStore({ allowScans: true })
  wrapper.stubOnePageScans.addResponse(
    {
      TableName: UNIT_TEST_TABLE
    },
    {
      Items: [shaunRecord, bobRecord],
      ...METADATA
    }
  )

  expect(await store.for(SHEEP_ENTITY).scanOnePage()).toEqual({ items: [shaunTheSheep, bobTheSheep] })
})

test('scanAll', async () => {
  const { wrapper, store } = wrapperAndStore({ allowScans: true })
  wrapper.stubAllPagesScans.addResponse(
    {
      TableName: UNIT_TEST_TABLE
    },
    [
      {
        Items: [shaunRecord, bobRecord],
        ...METADATA
      }
    ]
  )

  expect(await store.for(SHEEP_ENTITY).scanAll()).toEqual([shaunTheSheep, bobTheSheep])
})

test('scanWithLimit', async () => {
  const { wrapper, store } = wrapperAndStore({ allowScans: true })
  wrapper.stubOnePageScans.addResponse(
    {
      Limit: 5,
      TableName: UNIT_TEST_TABLE
    },
    {
      Items: [shaunRecord, bobRecord],
      ...METADATA
    }
  )

  expect(await store.for(SHEEP_ENTITY).scanOnePage({ limit: 5 })).toEqual({
    items: [shaunTheSheep, bobTheSheep]
  })
})

test('scanWithExclusiveStartKey', async () => {
  const { wrapper, store } = wrapperAndStore({ allowScans: true })
  wrapper.stubOnePageScans.addResponse(
    {
      ExclusiveStartKey: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      TableName: UNIT_TEST_TABLE
    },
    {
      Items: [shaunRecord, bobRecord],
      ...METADATA
    }
  )

  expect(
    await store.for(SHEEP_ENTITY).scanOnePage({
      exclusiveStartKey: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      }
    })
  ).toEqual({
    items: [shaunTheSheep, bobTheSheep]
  })
})

test('scanWithExclusiveStartKeyAndLimit', async () => {
  const { wrapper, store } = wrapperAndStore({ allowScans: true })
  wrapper.stubOnePageScans.addResponse(
    {
      ExclusiveStartKey: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      Limit: 5,
      TableName: UNIT_TEST_TABLE
    },
    {
      Items: [shaunRecord, bobRecord],
      ...METADATA
    }
  )

  expect(
    await store.for(SHEEP_ENTITY).scanOnePage({
      exclusiveStartKey: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      limit: 5
    })
  ).toEqual({
    items: [shaunTheSheep, bobTheSheep]
  })
})
