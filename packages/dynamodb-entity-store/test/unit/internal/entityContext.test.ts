import { expect, test } from 'vitest'
import {
  calcAllMetaAttributeNames,
  createEntityContext,
  EntityContext
} from '../../../src/lib/internal/entityContext.js'
import { FakeClock } from '../testSupportCode/fakes/fakeClock.js'
import { fakeDynamoDBInterface } from '../testSupportCode/fakes/fakeDynamoDBInterface.js'
import { Sheep, SHEEP_ENTITY } from '../../examples/sheepTypeAndEntity.js'
import {
  NoGSIStandardMetaAttributeNames,
  noopLogger,
  SingleGSIStandardMetaAttributeNames
} from '../../../src/lib/index.js'

test('calcAllMetaDataAttributeNames', () => {
  expect(calcAllMetaAttributeNames(NoGSIStandardMetaAttributeNames)).toEqual([
    'PK',
    'SK',
    'ttl',
    '_et',
    '_lastUpdated'
  ])
  expect(calcAllMetaAttributeNames(SingleGSIStandardMetaAttributeNames)).toEqual([
    'PK',
    'SK',
    'ttl',
    '_et',
    '_lastUpdated',
    'GSIPK',
    'GSISK'
  ])
})

const clock = new FakeClock()
const logger = noopLogger
const dynamoDB = fakeDynamoDBInterface()
const entity = SHEEP_ENTITY

test('createContextForStandardEntity', () => {
  const actual = createEntityContext(
    {
      storeContext: { clock, logger, dynamoDB },
      table: {
        tableName: 'testTable',
        metaAttributeNames: SingleGSIStandardMetaAttributeNames,
        gsiNames: { gsi: 'GSI' }
      }
    },
    entity
  )
  const expected: EntityContext<Sheep, unknown, unknown> = {
    dynamoDB,
    clock,
    logger,
    entity,
    tableName: 'testTable',
    tableGsiNames: {
      gsi: 'GSI'
    },
    metaAttributeNames: SingleGSIStandardMetaAttributeNames,
    allMetaAttributeNames: ['PK', 'SK', 'ttl', '_et', '_lastUpdated', 'GSIPK', 'GSISK']
  }
  expect(actual).toEqual(expected)
})

test('createContextForCustomEntity', () => {
  const expectedContext2: EntityContext<Sheep, unknown, unknown> = {
    dynamoDB,
    clock,
    logger,
    entity,
    allowScans: true,
    tableName: 'testTable',
    tableGsiNames: {},
    metaAttributeNames: {
      pk: 'PK',
      gsisById: {},
      lastUpdated: '_lastUpdated'
    },
    allMetaAttributeNames: ['PK', '_lastUpdated']
  }
  expect(
    createEntityContext(
      {
        storeContext: {
          clock,
          logger,
          dynamoDB
        },
        table: {
          tableName: 'testTable',
          allowScans: true,
          metaAttributeNames: { pk: 'PK', lastUpdated: '_lastUpdated' }
        }
      },
      entity
    )
  ).toEqual(expectedContext2)
})
