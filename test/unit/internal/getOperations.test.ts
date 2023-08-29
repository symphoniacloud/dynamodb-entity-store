import { describe, expect, test } from 'vitest'
import { SHEEP_ENTITY } from '../../examples/sheepTypeAndEntity'
import { contextFor } from '../testSupportCode/entityContextSupport'
import { createGetItemParams } from '../../../src/lib/internal/singleEntity/getItem'

const shaunIdentifier = { breed: 'merino', name: 'shaun' }

describe('createGetItemParams', () => {
  test('simple', () => {
    expect(createGetItemParams(contextFor(SHEEP_ENTITY), shaunIdentifier)).toEqual({
      TableName: 'testTable',
      Key: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      }
    })
  })

  test('set consistent read if specified', () => {
    expect(createGetItemParams(contextFor(SHEEP_ENTITY), shaunIdentifier, { consistentRead: true })).toEqual({
      TableName: 'testTable',
      Key: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      ConsistentRead: true
    })
  })
})
