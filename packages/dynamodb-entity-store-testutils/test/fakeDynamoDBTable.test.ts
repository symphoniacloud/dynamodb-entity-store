import { describe, it, expect } from 'vitest'
import { FakeTable } from '../src/fakeDynamoDBTable.js'

describe('FakeTable', () => {
  describe('PK-only table', () => {
    it('should put and get an item', () => {
      const table = new FakeTable('id', undefined)
      const item = { id: 'test-id', name: 'Test Item', value: 42 }

      table.putItem(item)

      const retrieved = table.get({ id: 'test-id' })
      expect(retrieved).toEqual(item)
    })

    it('should return undefined for non-existent item', () => {
      const table = new FakeTable('id', undefined)

      const retrieved = table.get({ id: 'non-existent' })
      expect(retrieved).toBeUndefined()
    })

    it('should update item with same PK', () => {
      const table = new FakeTable('id', undefined)
      table.putItem({ id: 'test-id', name: 'Original' })
      table.putItem({ id: 'test-id', name: 'Updated', extra: 'field' })

      const retrieved = table.get({ id: 'test-id' })
      expect(retrieved).toEqual({ id: 'test-id', name: 'Updated', extra: 'field' })
      expect(table.allItems()).toHaveLength(1)
    })

    it('should delete an item', () => {
      const table = new FakeTable('id', undefined)
      table.putItem({ id: 'test-id', name: 'Test' })

      table.deleteItem({ id: 'test-id' })

      expect(table.get({ id: 'test-id' })).toBeUndefined()
      expect(table.allItems()).toHaveLength(0)
    })

    it('should return all items', () => {
      const table = new FakeTable('id', undefined)
      table.putItem({ id: '1', name: 'First' })
      table.putItem({ id: '2', name: 'Second' })
      table.putItem({ id: '3', name: 'Third' })

      const all = table.allItems()
      expect(all).toHaveLength(3)
      expect(all).toContainEqual({ id: '1', name: 'First' })
      expect(all).toContainEqual({ id: '2', name: 'Second' })
      expect(all).toContainEqual({ id: '3', name: 'Third' })
    })

    it('should throw error if PK field is missing', () => {
      const table = new FakeTable('id', undefined)

      expect(() => table.putItem({ name: 'No ID' })).toThrow('PK field [id] is not found')
    })

    it('should handle undefined item gracefully on put', () => {
      const table = new FakeTable('id', undefined)

      expect(() => table.putItem(undefined)).not.toThrow()
      expect(table.allItems()).toHaveLength(0)
    })

    it('should throw error on keyFromItem with undefined item', () => {
      const table = new FakeTable('id', undefined)

      expect(() => table.keyFromItem(undefined)).toThrow('Item is undefined')
    })
  })

  describe('PK+SK table', () => {
    it('should put and get an item with composite key', () => {
      const table = new FakeTable('PK', 'SK')
      const item = { PK: 'USER#123', SK: 'PROFILE', name: 'John', age: 30 }

      table.putItem(item)

      const retrieved = table.get({ PK: 'USER#123', SK: 'PROFILE' })
      expect(retrieved).toEqual(item)
    })

    it('should distinguish items with same PK but different SK', () => {
      const table = new FakeTable('PK', 'SK')
      table.putItem({ PK: 'USER#123', SK: 'PROFILE', type: 'profile' })
      table.putItem({ PK: 'USER#123', SK: 'SETTINGS', type: 'settings' })

      expect(table.get({ PK: 'USER#123', SK: 'PROFILE' })).toEqual({
        PK: 'USER#123',
        SK: 'PROFILE',
        type: 'profile'
      })
      expect(table.get({ PK: 'USER#123', SK: 'SETTINGS' })).toEqual({
        PK: 'USER#123',
        SK: 'SETTINGS',
        type: 'settings'
      })
      expect(table.allItems()).toHaveLength(2)
    })

    it('should update item with same PK and SK', () => {
      const table = new FakeTable('PK', 'SK')
      table.putItem({ PK: 'USER#123', SK: 'PROFILE', name: 'Original' })
      table.putItem({ PK: 'USER#123', SK: 'PROFILE', name: 'Updated' })

      const retrieved = table.get({ PK: 'USER#123', SK: 'PROFILE' })
      expect(retrieved).toEqual({ PK: 'USER#123', SK: 'PROFILE', name: 'Updated' })
      expect(table.allItems()).toHaveLength(1)
    })

    it('should delete item by composite key', () => {
      const table = new FakeTable('PK', 'SK')
      table.putItem({ PK: 'USER#123', SK: 'PROFILE', name: 'Test' })
      table.putItem({ PK: 'USER#123', SK: 'SETTINGS', name: 'Other' })

      table.deleteItem({ PK: 'USER#123', SK: 'PROFILE' })

      expect(table.get({ PK: 'USER#123', SK: 'PROFILE' })).toBeUndefined()
      expect(table.get({ PK: 'USER#123', SK: 'SETTINGS' })).toBeDefined()
      expect(table.allItems()).toHaveLength(1)
    })

    it('should throw error if SK field is missing when SK is configured', () => {
      const table = new FakeTable('PK', 'SK')

      expect(() => table.putItem({ PK: 'USER#123', name: 'No SK' })).toThrow(
        'SK field [SK] is not found'
      )
    })

    it('should return all items regardless of key structure', () => {
      const table = new FakeTable('PK', 'SK')
      table.putItem({ PK: 'USER#1', SK: 'A', data: 'first' })
      table.putItem({ PK: 'USER#1', SK: 'B', data: 'second' })
      table.putItem({ PK: 'USER#2', SK: 'A', data: 'third' })

      const all = table.allItems()
      expect(all).toHaveLength(3)
    })
  })

  describe('Edge cases', () => {
    it('should handle numeric values in keys', () => {
      const table = new FakeTable('id', undefined)
      table.putItem({ id: 123, name: 'Numeric ID' })

      const retrieved = table.get({ id: 123 })
      expect(retrieved).toEqual({ id: 123, name: 'Numeric ID' })
    })

    it('should handle deleting non-existent item gracefully', () => {
      const table = new FakeTable('id', undefined)

      expect(() => table.deleteItem({ id: 'does-not-exist' })).not.toThrow()
      expect(table.allItems()).toHaveLength(0)
    })

    it('should maintain insertion order in allItems', () => {
      const table = new FakeTable('id', undefined)
      table.putItem({ id: '1', name: 'First' })
      table.putItem({ id: '2', name: 'Second' })
      table.putItem({ id: '3', name: 'Third' })

      const ids = table.allItems().map((item) => item.id)
      expect(ids).toEqual(['1', '2', '3'])
    })
  })
})
