import { expect, test } from 'vitest'
import { FakeDynamoDBInterface, METADATA } from '../src/index.js'

function ddb() {
  return new FakeDynamoDBInterface({
    pkOnly: { pkName: 'PK' },
    pkAndSk: { pkName: 'PK', skName: 'SK' }
  })
}

const PKONLY_TABLE_REQUEST = { TableName: 'pkOnly' }
const PKANDSK_TABLE_REQUEST = { TableName: 'pkAndSk' }
const EMPTY_GET_RESPONSE = { ...METADATA }

test('put, get, delete', async () => {
  const db = ddb()

  await db.put({ ...PKONLY_TABLE_REQUEST, Item: { PK: 1, b: 2 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { PK: 1, SK: 2, c: 3 } })

  expect(await db.get({ ...PKONLY_TABLE_REQUEST, Key: { PK: 1 } })).toEqual({
    Item: { PK: 1, b: 2 },
    ...METADATA
  })
  expect(await db.get({ ...PKANDSK_TABLE_REQUEST, Key: { PK: 1, SK: 2 } })).toEqual({
    Item: { PK: 1, SK: 2, c: 3 },
    ...METADATA
  })

  // Item key is not present since no item exists
  expect(await db.get({ ...PKONLY_TABLE_REQUEST, Key: { PK: 99 } })).toEqual(EMPTY_GET_RESPONSE)
  expect(await db.get({ ...PKANDSK_TABLE_REQUEST, Key: { PK: 1, SK: 99 } })).toEqual(EMPTY_GET_RESPONSE)

  await db.delete({ ...PKONLY_TABLE_REQUEST, Key: { PK: 1 } })
  expect(await db.get({ ...PKONLY_TABLE_REQUEST, Key: { PK: 1 } })).toEqual(EMPTY_GET_RESPONSE)
  await db.delete({ ...PKANDSK_TABLE_REQUEST, Key: { PK: 1, SK: 2 } })
  expect(await db.get({ ...PKANDSK_TABLE_REQUEST, Key: { PK: 1, SK: 2 } })).toEqual(EMPTY_GET_RESPONSE)
})

test('scan', async () => {
  const db = ddb()

  await db.put({ ...PKONLY_TABLE_REQUEST, Item: { PK: 1, b: 2 } })
  await db.put({ ...PKONLY_TABLE_REQUEST, Item: { PK: 2, b: 4 } })

  expect(await db.scanOnePage({ ...PKONLY_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { PK: 1, b: 2 },
      { PK: 2, b: 4 }
    ]
  })
  expect(await db.scanAllPages({ ...PKONLY_TABLE_REQUEST })).toEqual([
    {
      ...METADATA,
      Items: [
        { PK: 1, b: 2 },
        { PK: 2, b: 4 }
      ]
    }
  ])
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
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { PK: 1, SK: 2, c: 3 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { PK: 1, SK: 3, c: 4 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { PK: 2, SK: 1, c: 5 } })
  expect(await db.scanOnePage({ ...PKANDSK_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { PK: 1, SK: 2, c: 3 },
      { PK: 1, SK: 3, c: 4 },
      { PK: 2, SK: 1, c: 5 }
    ]
  })
  expect(await db.scanAllPages({ ...PKANDSK_TABLE_REQUEST })).toEqual([
    {
      ...METADATA,
      Items: [
        { PK: 1, SK: 2, c: 3 },
        { PK: 1, SK: 3, c: 4 },
        { PK: 2, SK: 1, c: 5 }
      ]
    }
  ])
})

test('get Table', async () => {
  const db = ddb()

  await db.put({ ...PKONLY_TABLE_REQUEST, Item: { PK: 1, b: 2 } })
  expect(db.getTable('pkOnly').get({ PK: 1 })).toEqual({
    PK: 1,
    b: 2
  })
  expect(db.getTable('pkAndSk').get({ PK: 1, SK: 2 })).toBeUndefined()
})

// TODO - overlaps with own and previous
test('batchPut', async () => {
  const db = ddb()

  await db.batchWrite({
    RequestItems: {
      pkOnly: [{ PutRequest: { Item: { PK: 1, b: 2 } } }, { PutRequest: { Item: { PK: 2, b: 4 } } }]
    }
  })

  expect(await db.scanOnePage({ ...PKONLY_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { PK: 1, b: 2 },
      { PK: 2, b: 4 }
    ]
  })

  expect(await db.scanOnePage({ ...PKANDSK_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: []
  })
  await db.batchWrite({
    RequestItems: {
      pkAndSk: [
        { PutRequest: { Item: { PK: 1, SK: 2, c: 3 } } },
        { PutRequest: { Item: { PK: 1, SK: 3, c: 4 } } },
        { PutRequest: { Item: { PK: 2, SK: 1, c: 5 } } }
      ]
    }
  })
  expect(await db.scanOnePage({ ...PKANDSK_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { PK: 1, SK: 2, c: 3 },
      { PK: 1, SK: 3, c: 4 },
      { PK: 2, SK: 1, c: 5 }
    ]
  })
})

test('batchDelete', async () => {
  const db = ddb()

  await db.put({ ...PKONLY_TABLE_REQUEST, Item: { PK: 1, b: 2 } })
  await db.put({ ...PKONLY_TABLE_REQUEST, Item: { PK: 2, b: 4 } })
  await db.put({ ...PKONLY_TABLE_REQUEST, Item: { PK: 3, b: 6 } })

  await db.batchWrite({
    RequestItems: {
      pkOnly: [{ DeleteRequest: { Key: { PK: 1 } } }, { DeleteRequest: { Key: { PK: 3 } } }]
    }
  })

  expect(await db.scanOnePage({ ...PKONLY_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [{ PK: 2, b: 4 }]
  })

  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { PK: 1, SK: 2, c: 3 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { PK: 1, SK: 3, c: 4 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { PK: 2, SK: 1, c: 5 } })

  await db.batchWrite({
    RequestItems: {
      pkAndSk: [{ DeleteRequest: { Key: { PK: 1, SK: 2 } } }, { DeleteRequest: { Key: { PK: 2, SK: 1 } } }]
    }
  })

  expect(await db.scanOnePage({ ...PKANDSK_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [{ PK: 1, SK: 3, c: 4 }]
  })
})

test('mixed put and delete batch with multiple tables', async () => {
  const db = ddb()

  await db.batchWrite({
    RequestItems: {
      pkOnly: [{ PutRequest: { Item: { PK: 1, b: 2 } } }, { PutRequest: { Item: { PK: 2, b: 4 } } }],
      pkAndSk: [
        { PutRequest: { Item: { PK: 1, SK: 2, c: 3 } } },
        { PutRequest: { Item: { PK: 1, SK: 3, c: 4 } } }
      ]
    }
  })
  await db.batchWrite({
    RequestItems: {
      pkOnly: [{ PutRequest: { Item: { PK: 3, b: 5 } } }, { DeleteRequest: { Key: { PK: 1 } } }],
      pkAndSk: [
        { PutRequest: { Item: { PK: 2, SK: 1, c: 5 } } },
        { DeleteRequest: { Key: { PK: 1, SK: 2 } } }
      ]
    }
  })

  expect(await db.scanOnePage({ ...PKONLY_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { PK: 2, b: 4 },
      { PK: 3, b: 5 }
    ]
  })
  expect(await db.scanOnePage({ ...PKANDSK_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { PK: 1, SK: 3, c: 4 },
      { PK: 2, SK: 1, c: 5 }
    ]
  })
})

// Only put and delete currently implemented
test('transactions', async () => {
  const db = ddb()

  await db.transactionWrite({
    TransactItems: [
      { Put: { ...PKONLY_TABLE_REQUEST, Item: { PK: 1, b: 2 } } },
      { Put: { ...PKONLY_TABLE_REQUEST, Item: { PK: 2, b: 4 } } },
      { Put: { ...PKANDSK_TABLE_REQUEST, Item: { PK: 1, SK: 2, c: 3 } } },
      { Put: { ...PKANDSK_TABLE_REQUEST, Item: { PK: 1, SK: 3, c: 4 } } }
    ]
  })

  expect(await db.scanOnePage({ ...PKONLY_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { PK: 1, b: 2 },
      { PK: 2, b: 4 }
    ]
  })

  expect(await db.scanOnePage({ ...PKANDSK_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { PK: 1, SK: 2, c: 3 },
      { PK: 1, SK: 3, c: 4 }
    ]
  })

  await db.transactionWrite({
    TransactItems: [
      { Delete: { ...PKONLY_TABLE_REQUEST, Key: { PK: 1 } } },
      { Put: { ...PKONLY_TABLE_REQUEST, Item: { PK: 3, b: 6 } } },
      { Delete: { ...PKANDSK_TABLE_REQUEST, Key: { PK: 1, SK: 2 } } },
      { Put: { ...PKANDSK_TABLE_REQUEST, Item: { PK: 1, SK: 4, c: 10 } } }
    ]
  })

  expect(await db.scanOnePage({ ...PKONLY_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { PK: 2, b: 4 },
      { PK: 3, b: 6 }
    ]
  })

  expect(await db.scanOnePage({ ...PKANDSK_TABLE_REQUEST })).toEqual({
    ...METADATA,
    Items: [
      { PK: 1, SK: 3, c: 4 },
      { PK: 1, SK: 4, c: 10 }
    ]
  })
})
