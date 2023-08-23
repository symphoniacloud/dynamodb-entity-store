import { expect, test } from 'vitest'
import {
  calcAllMetaAttributeNames,
  createEntityContext,
  EntityContext
} from '../../../src/lib/internal/entityContext'
import { FakeClock } from '../fakes/fakeClock'
import { fakeDynamoDBInterface } from '../fakes/fakeDynamoDBInterface'
import { Sheep, SHEEP_ENTITY } from '../../examples/sheepTypeAndEntity'
import { noopLogger } from '../../../src/lib/util/logger'
import {
  NoGSIStandardMetaAttributeNames,
  PKOnlyStandardMetaAttributeNames,
  SingleGSIStandardMetaAttributeNames,
  TwoGSIStandardMetaAttributeNames
} from '../../../src/lib/support/configSupport'

test('calcAllMetaDataAttributeNames', () => {
  expect(calcAllMetaAttributeNames(PKOnlyStandardMetaAttributeNames)).toEqual([
    'PK',
    'ttl',
    '_et',
    '_lastUpdated'
  ])
  expect(calcAllMetaAttributeNames(NoGSIStandardMetaAttributeNames)).toEqual([
    'PK',
    'ttl',
    '_et',
    '_lastUpdated',
    'SK'
  ])
  expect(calcAllMetaAttributeNames(SingleGSIStandardMetaAttributeNames)).toEqual([
    'PK',
    'ttl',
    '_et',
    '_lastUpdated',
    'SK',
    'GSIPK',
    'GSISK'
  ])
  expect(calcAllMetaAttributeNames(TwoGSIStandardMetaAttributeNames)).toEqual([
    'PK',
    'ttl',
    '_et',
    '_lastUpdated',
    'SK',
    'GSIPK',
    'GSISK',
    'GSI2PK',
    'GSI2SK'
  ])
})

const clock = new FakeClock()
const logger = noopLogger
const dynamoDB = fakeDynamoDBInterface()
const entity = SHEEP_ENTITY

test('createContextForStandardEntity', () => {
  const actual = createEntityContext(
    {
      tableName: 'testTable',
      clock,
      logger,
      dynamoDB,
      allowScans: false,
      metaAttributeNames: SingleGSIStandardMetaAttributeNames,
      gsiNames: { gsi: 'GSI' }
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
    allMetaAttributeNames: ['PK', 'ttl', '_et', '_lastUpdated', 'SK', 'GSIPK', 'GSISK']
  }
  expect(actual).toEqual(expected)
})

test('createContextForCustomEntity', () => {
  const expectedContext2: EntityContext<Sheep, unknown, unknown> = {
    dynamoDB,
    clock,
    logger,
    entity,
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
        tableName: 'testTable',
        clock,
        logger,
        dynamoDB: dynamoDB,
        allowScans: false,
        metaAttributeNames: { pk: 'PK', lastUpdated: '_lastUpdated' }
      },
      entity
    )
  ).toEqual(expectedContext2)
})
