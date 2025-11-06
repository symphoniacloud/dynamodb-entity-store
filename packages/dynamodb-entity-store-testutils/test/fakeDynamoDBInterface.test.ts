import { describe, it, expect, beforeEach } from 'vitest'
import { FakeDynamoDBInterface, METADATA } from '../src/fakeDynamoDBInterface.js'
import { BatchWriteCommandInput } from '@aws-sdk/lib-dynamodb'

describe('FakeDynamoDBInterface', () => {
  let db: FakeDynamoDBInterface

  beforeEach(() => {
    db = new FakeDynamoDBInterface({
      'test-table': { pkName: 'id', skName: undefined },
      'composite-table': { pkName: 'PK', skName: 'SK' }
    })
  })

  describe('constructor and table setup', () => {
    it('should create tables from configuration', () => {
      expect(db.tables['test-table']).toBeDefined()
      expect(db.tables['composite-table']).toBeDefined()
      expect(db.tables['test-table'].pkName).toBe('id')
      expect(db.tables['composite-table'].skName).toBe('SK')
    })

    it('should bind query and scan methods', () => {
      // This ensures the methods can be destructured without losing 'this' context
      const { queryAllPages, scanAllPages } = db
      expect(typeof queryAllPages).toBe('function')
      expect(typeof scanAllPages).toBe('function')
    })
  })

  describe('put', () => {
    it('should put an item into the table', async () => {
      const result = await db.put({
        TableName: 'test-table',
        Item: { id: '123', name: 'Test Item' }
      })

      expect(result).toEqual(METADATA)
      expect(db.tables['test-table'].allItems()).toHaveLength(1)
      expect(db.tables['test-table'].get({ id: '123' })).toEqual({ id: '123', name: 'Test Item' })
    })
  })

  describe('get', () => {
    it('should get an existing item', async () => {
      await db.put({
        TableName: 'test-table',
        Item: { id: '123', name: 'Test Item' }
      })

      const result = await db.get({
        TableName: 'test-table',
        Key: { id: '123' }
      })

      expect(result.Item).toEqual({ id: '123', name: 'Test Item' })
      expect(result.$metadata).toBeDefined()
    })

    it('should return undefined Item for non-existent item', async () => {
      const result = await db.get({
        TableName: 'test-table',
        Key: { id: 'non-existent' }
      })

      expect(result.Item).toBeUndefined()
    })
  })

  describe('delete', () => {
    it('should delete an item', async () => {
      await db.put({
        TableName: 'test-table',
        Item: { id: '123', name: 'Test Item' }
      })

      const result = await db.delete({
        TableName: 'test-table',
        Key: { id: '123' }
      })

      expect(result).toEqual(METADATA)
      expect(db.tables['test-table'].get({ id: '123' })).toBeUndefined()
    })
  })

  describe('batchWrite', () => {
    it('should handle put requests', async () => {
      const result = await db.batchWrite({
        RequestItems: {
          'test-table': [
            { PutRequest: { Item: { id: '1', name: 'First' } } },
            { PutRequest: { Item: { id: '2', name: 'Second' } } }
          ]
        }
      })

      expect(result).toEqual(METADATA)
      expect(db.tables['test-table'].allItems()).toHaveLength(2)
    })

    it('should handle delete requests', async () => {
      await db.put({ TableName: 'test-table', Item: { id: '1', name: 'First' } })
      await db.put({ TableName: 'test-table', Item: { id: '2', name: 'Second' } })

      await db.batchWrite({
        RequestItems: {
          'test-table': [{ DeleteRequest: { Key: { id: '1' } } }]
        }
      })

      expect(db.tables['test-table'].allItems()).toHaveLength(1)
      expect(db.tables['test-table'].get({ id: '2' })).toBeDefined()
    })

    it('should handle mixed put and delete requests', async () => {
      await db.put({ TableName: 'test-table', Item: { id: '1', name: 'Existing' } })

      await db.batchWrite({
        RequestItems: {
          'test-table': [
            { PutRequest: { Item: { id: '2', name: 'New' } } },
            { DeleteRequest: { Key: { id: '1' } } }
          ]
        }
      })

      expect(db.tables['test-table'].allItems()).toHaveLength(1)
      expect(db.tables['test-table'].get({ id: '2' })).toBeDefined()
      expect(db.tables['test-table'].get({ id: '1' })).toBeUndefined()
    })

    it('should throw if RequestItems is undefined', async () => {
      await expect(db.batchWrite({} as BatchWriteCommandInput)).rejects.toThrow(
        'RequestItems is required'
      )
    })
  })

  describe('transactionWrite', () => {
    it('should handle Put operations in transaction', async () => {
      const result = await db.transactionWrite({
        TransactItems: [
          {
            Put: {
              TableName: 'test-table',
              Item: { id: '1', name: 'First' }
            }
          },
          {
            Put: {
              TableName: 'test-table',
              Item: { id: '2', name: 'Second' }
            }
          }
        ]
      })

      expect(result).toEqual(METADATA)
      expect(db.tables['test-table'].allItems()).toHaveLength(2)
    })

    it('should handle Delete operations in transaction', async () => {
      await db.put({ TableName: 'test-table', Item: { id: '1', name: 'First' } })

      await db.transactionWrite({
        TransactItems: [
          {
            Delete: {
              TableName: 'test-table',
              Key: { id: '1' }
            }
          }
        ]
      })

      expect(db.tables['test-table'].get({ id: '1' })).toBeUndefined()
    })

    it('should handle mixed operations in transaction', async () => {
      await db.put({ TableName: 'test-table', Item: { id: '1', name: 'Existing' } })

      await db.transactionWrite({
        TransactItems: [
          {
            Put: {
              TableName: 'test-table',
              Item: { id: '2', name: 'New' }
            }
          },
          {
            Delete: {
              TableName: 'test-table',
              Key: { id: '1' }
            }
          }
        ]
      })

      expect(db.tables['test-table'].allItems()).toHaveLength(1)
      expect(db.tables['test-table'].get({ id: '2' })).toBeDefined()
    })

    it('should handle Update operations in transaction', async () => {
      await db.put({ TableName: 'test-table', Item: { id: '1', count: 0 } })

      await db.transactionWrite({
        TransactItems: [
          {
            Update: {
              TableName: 'test-table',
              Key: { id: '1' },
              UpdateExpression: 'SET #count = :val',
              ExpressionAttributeNames: { '#count': 'count' },
              ExpressionAttributeValues: { ':val': 5 }
            }
          }
        ]
      })

      const result = await db.get({ TableName: 'test-table', Key: { id: '1' } })
      expect(result.Item?.count).toBe(5)
    })
  })

  describe('scan operations', () => {
    beforeEach(async () => {
      await db.put({ TableName: 'test-table', Item: { id: '1', name: 'First' } })
      await db.put({ TableName: 'test-table', Item: { id: '2', name: 'Second' } })
      await db.put({ TableName: 'test-table', Item: { id: '3', name: 'Third' } })
    })

    it('should return all items in scanOnePage', async () => {
      const result = await db.scanOnePage({ TableName: 'test-table' })

      expect(result.Items).toHaveLength(3)
      expect(result.$metadata).toBeDefined()
    })

    it('should return all items in scanAllPages', async () => {
      const results = await db.scanAllPages({ TableName: 'test-table' })

      expect(results).toHaveLength(1)
      expect(results[0].Items).toHaveLength(3)
    })
  })

  describe('query operations', () => {
    beforeEach(async () => {
      await db.put({ TableName: 'test-table', Item: { id: '1', name: 'First' } })
      await db.put({ TableName: 'test-table', Item: { id: '2', name: 'Second' } })
    })

    it('should filter by partition key in queryAllPages', async () => {
      const results = await db.queryAllPages({
        TableName: 'test-table',
        KeyConditionExpression: 'id = :pk',
        ExpressionAttributeValues: { ':pk': '1' }
      })

      expect(results).toHaveLength(1)
      expect(results[0].Items).toHaveLength(1)
      expect(results[0].Items?.[0]).toEqual({ id: '1', name: 'First' })
    })

    it('queryOnePage should filter by partition key', async () => {
      const result = await db.queryOnePage({
        TableName: 'test-table',
        KeyConditionExpression: 'id = :pk',
        ExpressionAttributeValues: { ':pk': '1' }
      })

      expect(result.Items).toHaveLength(1)
      expect(result.Items?.[0]).toEqual({ id: '1', name: 'First' })
    })
  })

  describe('update operations', () => {
    it('should update an existing item', async () => {
      await db.put({ TableName: 'test-table', Item: { id: '1', count: 0, name: 'First' } })

      await db.update({
        TableName: 'test-table',
        Key: { id: '1' },
        UpdateExpression: 'SET #count = :val',
        ExpressionAttributeNames: { '#count': 'count' },
        ExpressionAttributeValues: { ':val': 5 }
      })

      const result = await db.get({ TableName: 'test-table', Key: { id: '1' } })
      expect(result.Item?.count).toBe(5)
      expect(result.Item?.name).toBe('First')
    })

    it('should create item if it does not exist', async () => {
      await db.update({
        TableName: 'test-table',
        Key: { id: '99' },
        UpdateExpression: 'SET #name = :val',
        ExpressionAttributeNames: { '#name': 'name' },
        ExpressionAttributeValues: { ':val': 'New' }
      })

      const result = await db.get({ TableName: 'test-table', Key: { id: '99' } })
      expect(result.Item?.name).toBe('New')
    })
  })

  describe('batchGet operations', () => {
    beforeEach(async () => {
      await db.put({ TableName: 'test-table', Item: { id: '1', name: 'First' } })
      await db.put({ TableName: 'test-table', Item: { id: '2', name: 'Second' } })
    })

    it('should get multiple items', async () => {
      const result = await db.batchGet({
        RequestItems: {
          'test-table': {
            Keys: [{ id: '1' }, { id: '2' }]
          }
        }
      })

      expect(result.Responses?.['test-table']).toHaveLength(2)
    })
  })

  describe('transactionGet operations', () => {
    beforeEach(async () => {
      await db.put({ TableName: 'test-table', Item: { id: '1', name: 'First' } })
      await db.put({ TableName: 'test-table', Item: { id: '2', name: 'Second' } })
    })

    it('should get multiple items in a transaction', async () => {
      const result = await db.transactionGet({
        TransactItems: [
          { Get: { TableName: 'test-table', Key: { id: '1' } } },
          { Get: { TableName: 'test-table', Key: { id: '2' } } }
        ]
      })

      expect(result.Responses).toHaveLength(2)
      expect(result.Responses?.[0].Item?.name).toBe('First')
      expect(result.Responses?.[1].Item?.name).toBe('Second')
    })
  })

  describe('table name handling', () => {
    it('should throw error for undefined table name', () => {
      expect(() => db.getTable(undefined)).toThrow('Table name is required')
    })

    it('should throw error for non-configured table', () => {
      expect(() => db.getTable('non-existent-table')).toThrow(
        'Table non-existent-table not configured'
      )
    })

    it('should get table from params object', () => {
      const table = db.getTableFrom({ TableName: 'test-table' })
      expect(table).toBe(db.tables['test-table'])
    })
  })

  describe('composite key table operations', () => {
    it('should handle put and get with composite keys', async () => {
      await db.put({
        TableName: 'composite-table',
        Item: { PK: 'USER#123', SK: 'PROFILE', name: 'John' }
      })

      const result = await db.get({
        TableName: 'composite-table',
        Key: { PK: 'USER#123', SK: 'PROFILE' }
      })

      expect(result.Item).toEqual({ PK: 'USER#123', SK: 'PROFILE', name: 'John' })
    })

    it('should handle delete with composite keys', async () => {
      await db.put({
        TableName: 'composite-table',
        Item: { PK: 'USER#123', SK: 'PROFILE', name: 'John' }
      })

      await db.delete({
        TableName: 'composite-table',
        Key: { PK: 'USER#123', SK: 'PROFILE' }
      })

      const result = await db.get({
        TableName: 'composite-table',
        Key: { PK: 'USER#123', SK: 'PROFILE' }
      })

      expect(result.Item).toBeUndefined()
    })
  })
})
