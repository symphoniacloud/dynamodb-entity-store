import { expect, test } from 'vitest'
import { FakeTable } from '../src/index.js'

function createTables() {
  return {
    pkOnly: new FakeTable('PK', undefined),
    pkAndSk: new FakeTable('PK', 'SK')
  }
}

test('basic put, get, delete', async () => {
  const { pkOnly, pkAndSk } = createTables()

  pkOnly.putItem({ PK: 1, b: 2 })
  pkOnly.putItem({ PK: 2, b: 3 })
  pkAndSk.putItem({ PK: 1, SK: 2, b: 3 })
  pkAndSk.putItem({ PK: 1, SK: 3, b: 4 })

  expect(pkOnly.allItems()).toEqual([
    {
      PK: 1,
      b: 2
    },
    {
      PK: 2,
      b: 3
    }
  ])
  expect(pkOnly.get({ PK: 1 })).toEqual({
    PK: 1,
    b: 2
  })
  expect(pkOnly.get({ PK: -1 })).toEqual(undefined)

  expect(pkAndSk.allItems()).toEqual([
    {
      PK: 1,
      SK: 2,
      b: 3
    },
    {
      PK: 1,
      SK: 3,
      b: 4
    }
  ])
  expect(pkAndSk.get({ PK: 1, SK: 3 })).toEqual({
    PK: 1,
    SK: 3,
    b: 4
  })
  expect(pkAndSk.get({ PK: -1, SK: 3 })).toEqual(undefined)

  pkOnly.deleteItem({ PK: 1 })
  pkAndSk.deleteItem({ PK: 1, SK: 3 })

  expect(pkOnly.allItems()).toEqual([
    {
      PK: 2,
      b: 3
    }
  ])
  expect(pkOnly.get({ PK: 1 })).toEqual(undefined)

  expect(pkAndSk.allItems()).toEqual([
    {
      PK: 1,
      SK: 2,
      b: 3
    }
  ])
  expect(pkAndSk.get({ PK: 1, SK: 3 })).toEqual(undefined)
})

test('put with duplicate key should overwrite', async () => {
  const { pkOnly, pkAndSk } = createTables()

  pkOnly.putItem({ PK: 1, b: 2 })
  pkOnly.putItem({ b: 99, PK: 1 })
  expect(pkOnly.allItems()).toEqual([
    {
      PK: 1,
      b: 99
    }
  ])

  pkAndSk.putItem({ PK: 1, SK: 2, b: 3 })
  pkAndSk.putItem({ PK: 1, SK: 4, b: 3 })
  pkAndSk.putItem({ SK: 2, PK: 1, b: 99 })

  expect(pkAndSk.allItems()).toEqual([
    {
      PK: 1,
      SK: 2,
      b: 99
    },
    {
      PK: 1,
      SK: 4,
      b: 3
    }
  ])
})

test('invalid requests', async () => {
  const { pkOnly, pkAndSk } = createTables()
  expect(() => pkOnly.putItem({ name: 'zz' })).toThrow('PK field [PK] is not found')
  expect(() => pkAndSk.putItem({ name: 'zz' })).toThrow('PK field [PK] is not found')
  expect(() => pkAndSk.putItem({ PK: 1, name: 'zz' })).toThrow('SK field [SK] is not found')
  expect(() => pkOnly.get(undefined)).toThrow('Item is undefined')
})
