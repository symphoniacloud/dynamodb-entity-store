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
      ReturnValues: 'ALL_OLD'
    })
  ).rejects.toThrow('FakeDynamoDBInterface.put does not support the following properties: ReturnValues')
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

test('batchWrite throws error when unsupported properties are provided', async () => {
  const db = ddb()

  await expect(
    db.batchWrite({
      RequestItems: {
        pkOnly: [{ PutRequest: { Item: { TEST_PK: 1, b: 2 } } }]
      },
      ReturnConsumedCapacity: 'TOTAL'
    })
  ).rejects.toThrow(
    'FakeDynamoDBInterface.batchWrite does not support the following properties: ReturnConsumedCapacity'
  )

  await expect(
    db.batchWrite({
      RequestItems: {
        pkOnly: [{ PutRequest: { Item: { TEST_PK: 1, b: 2 } } }]
      },
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnConsumedCapacity: 'TOTAL'
    })
  ).rejects.toThrow(
    'FakeDynamoDBInterface.batchWrite does not support the following properties: ReturnItemCollectionMetrics, ReturnConsumedCapacity'
  )
})

test('transactionWrite throws error when unsupported properties are provided', async () => {
  const db = ddb()

  await expect(
    db.transactionWrite({
      TransactItems: [
        {
          Put: {
            TableName: 'pkOnly',
            Item: { TEST_PK: 1, b: 2 }
          }
        }
      ],
      ReturnConsumedCapacity: 'TOTAL'
    })
  ).rejects.toThrow(
    'FakeDynamoDBInterface.transactionWrite does not support the following properties: ReturnConsumedCapacity'
  )

  await expect(
    db.transactionWrite({
      TransactItems: [
        {
          Put: {
            TableName: 'pkOnly',
            Item: { TEST_PK: 1, b: 2 }
          }
        }
      ],
      ClientRequestToken: 'token123',
      ReturnItemCollectionMetrics: 'SIZE'
    })
  ).rejects.toThrow(
    'FakeDynamoDBInterface.transactionWrite does not support the following properties: ClientRequestToken, ReturnItemCollectionMetrics'
  )
})

test('scanOnePage throws error when unsupported properties are provided', async () => {
  const db = ddb()

  await expect(
    db.scanOnePage({
      ...PKONLY_TABLE_REQUEST,
      Limit: 10
    })
  ).rejects.toThrow('FakeDynamoDBInterface.scanOnePage does not support the following properties: Limit')

  await expect(
    db.scanOnePage({
      ...PKONLY_TABLE_REQUEST,
      FilterExpression: 'b > :val',
      ExpressionAttributeValues: { ':val': 5 }
    })
  ).rejects.toThrow(
    'FakeDynamoDBInterface.scanOnePage does not support the following properties: FilterExpression, ExpressionAttributeValues'
  )
})

test('scanAllPages throws error when unsupported properties are provided', async () => {
  const db = ddb()

  await expect(
    db.scanAllPages({
      ...PKONLY_TABLE_REQUEST,
      ConsistentRead: true
    })
  ).rejects.toThrow(
    'FakeDynamoDBInterface.scanAllPages does not support the following properties: ConsistentRead'
  )

  await expect(
    db.scanAllPages({
      ...PKONLY_TABLE_REQUEST,
      ProjectionExpression: 'TEST_PK',
      ExpressionAttributeNames: { '#pk': 'TEST_PK' }
    })
  ).rejects.toThrow(
    'FakeDynamoDBInterface.scanAllPages does not support the following properties: ProjectionExpression, ExpressionAttributeNames'
  )
})

// Query Integration Tests

test('queryOnePage with PK only', async () => {
  const db = ddb()

  // Add some items
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'A', value: 10 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'B', value: 20 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 2, TEST_SK: 'A', value: 30 } })

  const result = await db.queryOnePage({
    ...PKANDSK_TABLE_REQUEST,
    KeyConditionExpression: 'TEST_PK = :pk',
    ExpressionAttributeValues: { ':pk': 1 }
  })

  expect(result.Items).toHaveLength(2)
  expect(result.Items).toContainEqual({ TEST_PK: 1, TEST_SK: 'A', value: 10 })
  expect(result.Items).toContainEqual({ TEST_PK: 1, TEST_SK: 'B', value: 20 })
})

test('queryOnePage with PK and SK equality', async () => {
  const db = ddb()

  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'A', value: 10 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'B', value: 20 } })

  const result = await db.queryOnePage({
    ...PKANDSK_TABLE_REQUEST,
    KeyConditionExpression: 'TEST_PK = :pk AND TEST_SK = :sk',
    ExpressionAttributeValues: { ':pk': 1, ':sk': 'A' }
  })

  expect(result.Items).toHaveLength(1)
  expect(result.Items).toContainEqual({ TEST_PK: 1, TEST_SK: 'A', value: 10 })
})

test('queryOnePage with PK and SK greater than', async () => {
  const db = ddb()

  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'A', value: 10 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'B', value: 20 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'C', value: 30 } })

  const result = await db.queryOnePage({
    ...PKANDSK_TABLE_REQUEST,
    KeyConditionExpression: 'TEST_PK = :pk AND TEST_SK > :sk',
    ExpressionAttributeValues: { ':pk': 1, ':sk': 'A' }
  })

  expect(result.Items).toHaveLength(2)
  expect(result.Items).toContainEqual({ TEST_PK: 1, TEST_SK: 'B', value: 20 })
  expect(result.Items).toContainEqual({ TEST_PK: 1, TEST_SK: 'C', value: 30 })
})

test('queryOnePage with begins_with', async () => {
  const db = ddb()

  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'ITEM#100', value: 10 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'ITEM#200', value: 20 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'ORDER#100', value: 30 } })

  const result = await db.queryOnePage({
    ...PKANDSK_TABLE_REQUEST,
    KeyConditionExpression: 'TEST_PK = :pk AND begins_with(TEST_SK, :prefix)',
    ExpressionAttributeValues: { ':pk': 1, ':prefix': 'ITEM#' }
  })

  expect(result.Items).toHaveLength(2)
  expect(result.Items).toContainEqual({ TEST_PK: 1, TEST_SK: 'ITEM#100', value: 10 })
  expect(result.Items).toContainEqual({ TEST_PK: 1, TEST_SK: 'ITEM#200', value: 20 })
})

test('queryOnePage with Limit', async () => {
  const db = ddb()

  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'A', value: 10 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'B', value: 20 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'C', value: 30 } })

  const result = await db.queryOnePage({
    ...PKANDSK_TABLE_REQUEST,
    KeyConditionExpression: 'TEST_PK = :pk',
    ExpressionAttributeValues: { ':pk': 1 },
    Limit: 2
  })

  expect(result.Items).toHaveLength(2)
})

test('queryOnePage with ExpressionAttributeNames', async () => {
  const db = ddb()

  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'A', value: 10 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'B', value: 20 } })

  const result = await db.queryOnePage({
    ...PKANDSK_TABLE_REQUEST,
    KeyConditionExpression: '#pk = :pk AND #sk = :sk',
    ExpressionAttributeNames: { '#pk': 'TEST_PK', '#sk': 'TEST_SK' },
    ExpressionAttributeValues: { ':pk': 1, ':sk': 'A' }
  })

  expect(result.Items).toHaveLength(1)
  expect(result.Items).toContainEqual({ TEST_PK: 1, TEST_SK: 'A', value: 10 })
})

test('queryOnePage returns empty when no matches', async () => {
  const db = ddb()

  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'A', value: 10 } })

  const result = await db.queryOnePage({
    ...PKANDSK_TABLE_REQUEST,
    KeyConditionExpression: 'TEST_PK = :pk',
    ExpressionAttributeValues: { ':pk': 999 }
  })

  expect(result.Items).toHaveLength(0)
})

test('queryOnePage throws on missing KeyConditionExpression', async () => {
  const db = ddb()

  await expect(
    db.queryOnePage({
      ...PKANDSK_TABLE_REQUEST
    })
  ).rejects.toThrow('KeyConditionExpression is required for query')
})

test('queryOnePage throws on unsupported properties', async () => {
  const db = ddb()

  await expect(
    db.queryOnePage({
      ...PKANDSK_TABLE_REQUEST,
      KeyConditionExpression: 'TEST_PK = :pk',
      ExpressionAttributeValues: { ':pk': 1 },
      FilterExpression: 'value > :val'
    })
  ).rejects.toThrow(
    'FakeDynamoDBInterface.queryOnePage does not support the following properties: FilterExpression'
  )
})

test('queryAllPages returns all matching items', async () => {
  const db = ddb()

  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'A', value: 10 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'B', value: 20 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 2, TEST_SK: 'A', value: 30 } })

  const results = await db.queryAllPages({
    ...PKANDSK_TABLE_REQUEST,
    KeyConditionExpression: 'TEST_PK = :pk',
    ExpressionAttributeValues: { ':pk': 1 }
  })

  expect(results).toHaveLength(1)
  expect(results[0].Items).toHaveLength(2)
  expect(results[0].Items).toContainEqual({ TEST_PK: 1, TEST_SK: 'A', value: 10 })
  expect(results[0].Items).toContainEqual({ TEST_PK: 1, TEST_SK: 'B', value: 20 })
})

test('queryAllPages with SK condition', async () => {
  const db = ddb()

  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'A', value: 10 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'B', value: 20 } })
  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'C', value: 30 } })

  const results = await db.queryAllPages({
    ...PKANDSK_TABLE_REQUEST,
    KeyConditionExpression: 'TEST_PK = :pk AND TEST_SK >= :sk',
    ExpressionAttributeValues: { ':pk': 1, ':sk': 'B' }
  })

  expect(results).toHaveLength(1)
  expect(results[0].Items).toHaveLength(2)
  expect(results[0].Items).toContainEqual({ TEST_PK: 1, TEST_SK: 'B', value: 20 })
  expect(results[0].Items).toContainEqual({ TEST_PK: 1, TEST_SK: 'C', value: 30 })
})

test('queryAllPages returns empty when no matches', async () => {
  const db = ddb()

  await db.put({ ...PKANDSK_TABLE_REQUEST, Item: { TEST_PK: 1, TEST_SK: 'A', value: 10 } })

  const results = await db.queryAllPages({
    ...PKANDSK_TABLE_REQUEST,
    KeyConditionExpression: 'TEST_PK = :pk',
    ExpressionAttributeValues: { ':pk': 999 }
  })

  expect(results).toHaveLength(1)
  expect(results[0].Items).toHaveLength(0)
})

test('queryAllPages throws on unsupported properties', async () => {
  const db = ddb()

  await expect(
    db.queryAllPages({
      ...PKANDSK_TABLE_REQUEST,
      KeyConditionExpression: 'TEST_PK = :pk',
      ExpressionAttributeValues: { ':pk': 1 },
      Limit: 10
    })
  ).rejects.toThrow(
    'FakeDynamoDBInterface.queryAllPages does not support the following properties: Limit'
  )
})

// Condition Expression Integration Tests

test('put with ConditionExpression - attribute_not_exists', async () => {
  const db = ddb()

  // First put succeeds
  await db.put({
    ...PKONLY_TABLE_REQUEST,
    Item: { TEST_PK: 1, name: 'alice' },
    ConditionExpression: 'attribute_not_exists(TEST_PK)'
  })

  expect(await db.get({ ...PKONLY_TABLE_REQUEST, Key: { TEST_PK: 1 } })).toEqual({
    Item: { TEST_PK: 1, name: 'alice' },
    ...METADATA
  })

  // Second put with same condition should fail
  await expect(
    db.put({
      ...PKONLY_TABLE_REQUEST,
      Item: { TEST_PK: 1, name: 'bob' },
      ConditionExpression: 'attribute_not_exists(TEST_PK)'
    })
  ).rejects.toThrow('The conditional request failed')
})

test('put with ConditionExpression - complex expression with ExpressionAttributeNames and ExpressionAttributeValues', async () => {
  const db = ddb()

  await db.put({
    ...PKONLY_TABLE_REQUEST,
    Item: { TEST_PK: 1, name: 'alice', status: 'active' }
  })

  // Complex condition: NOT #name = :invalidName
  await db.put({
    ...PKONLY_TABLE_REQUEST,
    Item: { TEST_PK: 1, name: 'alice', status: 'inactive' },
    ConditionExpression: 'NOT #name = :invalidName',
    ExpressionAttributeNames: { '#name': 'name' },
    ExpressionAttributeValues: { ':invalidName': 'bob' }
  })

  expect(await db.get({ ...PKONLY_TABLE_REQUEST, Key: { TEST_PK: 1 } })).toEqual({
    Item: { TEST_PK: 1, name: 'alice', status: 'inactive' },
    ...METADATA
  })
})
