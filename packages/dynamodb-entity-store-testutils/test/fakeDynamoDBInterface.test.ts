import { expect, test } from 'vitest'
import { FakeDynamoDBInterface, METADATA } from '../src/index.js'

function ddb() {
  return new FakeDynamoDBInterface({
    pkOnly: { pkName: 'TEST_PK' },
    pkAndSk: { pkName: 'TEST_PK', skName: 'TEST_SK' }
  })
}

const PKONLY_TABLE_REQUEST = { TableName: 'pkOnly' }
const PKANDSK_TABLE_REQUEST = { TableName: 'pkAndSk' }
const EMPTY_GET_RESPONSE = { ...METADATA }

test('put, get, delete pk only', async () => {
  const db = ddb()

  await db.put({ ...PKONLY_TABLE_REQUEST, Item: { TEST_PK: 1, b: 2 } })

  expect(await db.get({ ...PKONLY_TABLE_REQUEST, Key: { TEST_PK: 1 } })).toEqual({
    Item: { TEST_PK: 1, b: 2 },
    ...METADATA
  })

  // Item key is not present since no item exists
  expect(await db.get({ ...PKONLY_TABLE_REQUEST, Key: { TEST_PK: 99 } })).toEqual(EMPTY_GET_RESPONSE)

  await db.delete({ ...PKONLY_TABLE_REQUEST, Key: { TEST_PK: 1 } })
  expect(await db.get({ ...PKONLY_TABLE_REQUEST, Key: { TEST_PK: 1 } })).toEqual(EMPTY_GET_RESPONSE)
})

test('put, get, delete pk and sk', async () => {
  const db = ddb()

  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 2, c: 3 } })
  expect(await db.get({ ...PKANDSK_TABLE_REQUEST, Key: { TEST_PK: 1, TEST_SK: 2 } })).toEqual({
    Item: { TEST_PK: 1, TEST_SK: 2, c: 3 },
    ...METADATA
  })

  // Item key is not present since no item exists
  expect(await db.get({ ...PKANDSK_TABLE_REQUEST, Key: { TEST_PK: 1, TEST_SK: 99 } })).toEqual(
    EMPTY_GET_RESPONSE
  )

  await db.delete({ ...PKANDSK_TABLE_REQUEST, Key: { TEST_PK: 1, TEST_SK: 2 } })
  expect(await db.get({ ...PKANDSK_TABLE_REQUEST, Key: { TEST_PK: 1, TEST_SK: 2 } })).toEqual(
    EMPTY_GET_RESPONSE
  )
})

test('convenience put function pk only', async () => {
  const db = ddb()

  db.putToTable('pkOnly', { TEST_PK: 1, b: 2 })

  expect(await db.get({ ...PKONLY_TABLE_REQUEST, Key: { TEST_PK: 1 } })).toEqual({
    Item: { TEST_PK: 1, b: 2 },
    ...METADATA
  })
})

test('convenience put function pk and sk', async () => {
  const db = ddb()

  db.putToTable('pkAndSk', { TEST_PK: 1, TEST_SK: 2, c: 3 })

  expect(await db.get({ ...PKANDSK_TABLE_REQUEST, Key: { TEST_PK: 1, TEST_SK: 2 } })).toEqual({
    Item: { TEST_PK: 1, TEST_SK: 2, c: 3 },
    ...METADATA
  })
})

test('convenience get functions pk only', async () => {
  const db = ddb()

  await db.put({ ...PKONLY_TABLE_REQUEST, Item: { TEST_PK: 1, b: 2 } })
  await db.put({ ...PKONLY_TABLE_REQUEST, Item: { TEST_PK: 2, b: 3 } })

  expect(db.getFromTable('pkOnly', { TEST_PK: 1 })).toEqual({ TEST_PK: 1, b: 2 })
  expect(db.getAllFromTable('pkOnly')).toEqual([
    {
      TEST_PK: 1,
      b: 2
    },
    {
      TEST_PK: 2,
      b: 3
    }
  ])
})

test('convenience get functions pk and sk', async () => {
  const db = ddb()

  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 2, c: 3 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 3, c: 4 } })

  expect(db.getFromTable('pkAndSk', { TEST_PK: 1, TEST_SK: 2 })).toEqual({ TEST_PK: 1, TEST_SK: 2, c: 3 })
  expect(db.getAllFromTable('pkAndSk')).toEqual([
    {
      TEST_PK: 1,
      TEST_SK: 2,
      c: 3
    },
    {
      TEST_PK: 1,
      TEST_SK: 3,
      c: 4
    }
  ])
})

test('puts with same key should overwrite pk only', async () => {
  const db = ddb()

  db.putToTable('pkOnly', { TEST_PK: 1, b: 2 })
  db.putToTable('pkOnly', { TEST_PK: 1, b: 55 })

  expect(db.getFromTable('pkOnly', { TEST_PK: 1 })).toEqual({ TEST_PK: 1, b: 55 })
  expect(db.getAllFromTable('pkOnly')).toEqual([
    {
      TEST_PK: 1,
      b: 55
    }
  ])
})

test('puts with same key should overwrite pk and sk', async () => {
  const db = ddb()

  db.putToTable('pkAndSk', { TEST_PK: 1, TEST_SK: 2, b: 2 })
  db.putToTable('pkAndSk', { TEST_PK: 1, TEST_SK: 2, b: 55 })

  expect(db.getFromTable('pkAndSk', { TEST_PK: 1, TEST_SK: 2 })).toEqual({ TEST_PK: 1, TEST_SK: 2, b: 55 })
  expect(db.getAllFromTable('pkAndSk')).toEqual([
    {
      TEST_PK: 1,
      TEST_SK: 2,
      b: 55
    }
  ])
})

test('scan pk only', async () => {
  const db = ddb()

  expect(await db.scanOnePage({ ...PKONLY_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: []
  })
  expect(await db.scanAllPages({ ...PKONLY_TABLE_REQUEST })).toEqual([
    {
      ...METADATA,
      Items: []
    }
  ])
  await db.put({ ...PKONLY_TABLE_REQUEST, Item: { TEST_PK: 1, b: 2 } })
  await db.put({ ...PKONLY_TABLE_REQUEST, Item: { TEST_PK: 2, b: 4 } })

  expect(await db.scanOnePage({ ...PKONLY_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { TEST_PK: 1, b: 2 },
      { TEST_PK: 2, b: 4 }
    ]
  })
  expect(await db.scanAllPages({ ...PKONLY_TABLE_REQUEST })).toEqual([
    {
      ...METADATA,
      Items: [
        { TEST_PK: 1, b: 2 },
        { TEST_PK: 2, b: 4 }
      ]
    }
  ])
})

test('scan pk and sk', async () => {
  const db = ddb()

  expect(await db.scanOnePage({ ...PKANDSK_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: []
  })
  expect(await db.scanAllPages({ ...PKANDSK_TABLE_REQUEST })).toEqual([
    {
      ...METADATA,
      Items: []
    }
  ])
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 2, c: 3 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 3, c: 4 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 2, TEST_SK: 1, c: 5 } })
  expect(await db.scanOnePage({ ...PKANDSK_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { TEST_PK: 1, TEST_SK: 2, c: 3 },
      { TEST_PK: 1, TEST_SK: 3, c: 4 },
      { TEST_PK: 2, TEST_SK: 1, c: 5 }
    ]
  })
  expect(await db.scanAllPages({ ...PKANDSK_TABLE_REQUEST })).toEqual([
    {
      ...METADATA,
      Items: [
        { TEST_PK: 1, TEST_SK: 2, c: 3 },
        { TEST_PK: 1, TEST_SK: 3, c: 4 },
        { TEST_PK: 2, TEST_SK: 1, c: 5 }
      ]
    }
  ])
})

test('batchPut', async () => {
  const db = ddb()

  await db.batchWrite({
    RequestItems: {
      pkOnly: [
        { PutRequest: { Item: { TEST_PK: 1, b: 2 } } },
        { PutRequest: { Item: { TEST_PK: 2, b: 4 } } }
      ],
      pkAndSk: [
        { PutRequest: { Item: { TEST_PK: 1, TEST_SK: 2, c: 3 } } },
        { PutRequest: { Item: { TEST_PK: 1, TEST_SK: 3, c: 4 } } },
        { PutRequest: { Item: { TEST_PK: 2, TEST_SK: 1, c: 5 } } }
      ]
    }
  })

  expect(await db.scanOnePage({ ...PKONLY_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { TEST_PK: 1, b: 2 },
      { TEST_PK: 2, b: 4 }
    ]
  })
  expect(await db.scanOnePage({ ...PKANDSK_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { TEST_PK: 1, TEST_SK: 2, c: 3 },
      { TEST_PK: 1, TEST_SK: 3, c: 4 },
      { TEST_PK: 2, TEST_SK: 1, c: 5 }
    ]
  })
})

test('batch puts should overwrite existing keys', async () => {
  const db = ddb()

  db.putToTable('pkOnly', { TEST_PK: 1, b: 2 })
  db.putToTable('pkAndSk', { TEST_PK: 1, TEST_SK: 2, c: 3 })

  await db.batchWrite({
    RequestItems: {
      pkOnly: [{ PutRequest: { Item: { TEST_PK: 1, b: 55 } } }],
      pkAndSk: [{ PutRequest: { Item: { TEST_PK: 1, TEST_SK: 2, c: 55 } } }]
    }
  })

  expect(await db.scanOnePage({ ...PKONLY_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [{ TEST_PK: 1, b: 55 }]
  })
  expect(await db.scanOnePage({ ...PKANDSK_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [{ TEST_PK: 1, TEST_SK: 2, c: 55 }]
  })
})

test('batchDelete pk only', async () => {
  const db = ddb()

  await db.put({ ...PKONLY_TABLE_REQUEST, Item: { TEST_PK: 1, b: 2 } })
  await db.put({ ...PKONLY_TABLE_REQUEST, Item: { TEST_PK: 2, b: 4 } })
  await db.put({ ...PKONLY_TABLE_REQUEST, Item: { TEST_PK: 3, b: 6 } })

  await db.batchWrite({
    RequestItems: {
      pkOnly: [{ DeleteRequest: { Key: { TEST_PK: 1 } } }, { DeleteRequest: { Key: { TEST_PK: 3 } } }]
    }
  })

  expect(await db.scanOnePage({ ...PKONLY_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [{ TEST_PK: 2, b: 4 }]
  })
})

test('batchDelete pk and sk', async () => {
  const db = ddb()

  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 2, c: 3 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 3, c: 4 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 2, TEST_SK: 1, c: 5 } })

  await db.batchWrite({
    RequestItems: {
      pkAndSk: [
        { DeleteRequest: { Key: { TEST_PK: 1, TEST_SK: 2 } } },
        { DeleteRequest: { Key: { TEST_PK: 2, TEST_SK: 1 } } }
      ]
    }
  })

  expect(await db.scanOnePage({ ...PKANDSK_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [{ TEST_PK: 1, TEST_SK: 3, c: 4 }]
  })
})

test('mixed put and delete batch with multiple tables', async () => {
  const db = ddb()

  await db.batchWrite({
    RequestItems: {
      pkOnly: [
        { PutRequest: { Item: { TEST_PK: 1, b: 2 } } },
        { PutRequest: { Item: { TEST_PK: 2, b: 4 } } }
      ],
      pkAndSk: [
        { PutRequest: { Item: { TEST_PK: 1, TEST_SK: 2, c: 3 } } },
        { PutRequest: { Item: { TEST_PK: 1, TEST_SK: 3, c: 4 } } }
      ]
    }
  })
  await db.batchWrite({
    RequestItems: {
      pkOnly: [{ PutRequest: { Item: { TEST_PK: 3, b: 5 } } }, { DeleteRequest: { Key: { TEST_PK: 1 } } }],
      pkAndSk: [
        { PutRequest: { Item: { TEST_PK: 2, TEST_SK: 1, c: 5 } } },
        { DeleteRequest: { Key: { TEST_PK: 1, TEST_SK: 2 } } }
      ]
    }
  })

  expect(await db.scanOnePage({ ...PKONLY_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { TEST_PK: 2, b: 4 },
      { TEST_PK: 3, b: 5 }
    ]
  })
  expect(await db.scanOnePage({ ...PKANDSK_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { TEST_PK: 1, TEST_SK: 3, c: 4 },
      { TEST_PK: 2, TEST_SK: 1, c: 5 }
    ]
  })
})

// Only put and delete currently implemented
test('transactionWrite', async () => {
  const db = ddb()

  db.putToTable('pkOnly', { TEST_PK: 1, b: 2 })
  db.putToTable('pkAndSk', { TEST_PK: 1, TEST_SK: 2, c: 3 })

  await db.transactionWrite({
    TransactItems: [
      { Put: { ...PKONLY_TABLE_REQUEST, Item: { TEST_PK: 1, b: 55 } } },
      { Put: { ...PKONLY_TABLE_REQUEST, Item: { TEST_PK: 2, b: 4 } } },
      { Put: { ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 2, c: 55 } } },
      { Put: { ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 3, c: 4 } } }
    ]
  })

  expect(await db.scanOnePage({ ...PKONLY_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { TEST_PK: 1, b: 55 },
      { TEST_PK: 2, b: 4 }
    ]
  })

  expect(await db.scanOnePage({ ...PKANDSK_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { TEST_PK: 1, TEST_SK: 2, c: 55 },
      { TEST_PK: 1, TEST_SK: 3, c: 4 }
    ]
  })

  await db.transactionWrite({
    TransactItems: [
      { Delete: { ...PKONLY_TABLE_REQUEST, Key: { TEST_PK: 1 } } },
      { Put: { ...PKONLY_TABLE_REQUEST, Item: { TEST_PK: 3, b: 6 } } },
      { Delete: { ...PKANDSK_TABLE_REQUEST, Key: { TEST_PK: 1, TEST_SK: 2 } } },
      { Put: { ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 4, c: 10 } } }
    ]
  })

  expect(await db.scanOnePage({ ...PKONLY_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { TEST_PK: 2, b: 4 },
      { TEST_PK: 3, b: 6 }
    ]
  })

  expect(await db.scanOnePage({ ...PKANDSK_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { TEST_PK: 1, TEST_SK: 3, c: 4 },
      { TEST_PK: 1, TEST_SK: 4, c: 10 }
    ]
  })
})

test('put throws error when unsupported properties are provided', async () => {
  const db = ddb()

  await expect(
    db.put({
      ...PKONLY_TABLE_REQUEST,
      Item: { TEST_PK: 1, b: 2 },
      ConditionExpression: 'attribute_not_exists(TEST_PK)'
    })
  ).rejects.toThrow(
    'FakeDynamoDBInterface.put does not support the following properties: ConditionExpression'
  )

  await expect(
    db.put({
      ...PKONLY_TABLE_REQUEST,
      Item: { TEST_PK: 1, b: 2 },
      ReturnValues: 'ALL_OLD',
      ExpressionAttributeNames: { '#a': 'b' }
    })
  ).rejects.toThrow(
    'FakeDynamoDBInterface.put does not support the following properties: ReturnValues, ExpressionAttributeNames'
  )
})

test('get throws error when unsupported properties are provided', async () => {
  const db = ddb()

  await expect(
    db.get({
      ...PKONLY_TABLE_REQUEST,
      Key: { TEST_PK: 1 },
      ConsistentRead: true
    })
  ).rejects.toThrow('FakeDynamoDBInterface.get does not support the following properties: ConsistentRead')

  await expect(
    db.get({
      ...PKONLY_TABLE_REQUEST,
      Key: { TEST_PK: 1 },
      ProjectionExpression: 'b',
      ExpressionAttributeNames: { '#b': 'b' }
    })
  ).rejects.toThrow(
    'FakeDynamoDBInterface.get does not support the following properties: ProjectionExpression, ExpressionAttributeNames'
  )
})

test('delete throws error when unsupported properties are provided', async () => {
  const db = ddb()

  await expect(
    db.delete({
      ...PKONLY_TABLE_REQUEST,
      Key: { TEST_PK: 1 },
      ConditionExpression: 'attribute_exists(TEST_PK)'
    })
  ).rejects.toThrow(
    'FakeDynamoDBInterface.delete does not support the following properties: ConditionExpression'
  )

  await expect(
    db.delete({
      ...PKONLY_TABLE_REQUEST,
      Key: { TEST_PK: 1 },
      ReturnValues: 'ALL_OLD',
      ExpressionAttributeNames: { '#a': 'b' }
    })
  ).rejects.toThrow(
    'FakeDynamoDBInterface.delete does not support the following properties: ReturnValues, ExpressionAttributeNames'
  )
})
