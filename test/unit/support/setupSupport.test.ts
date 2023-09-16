import { expect, test } from 'vitest'
import {
  createMinimumSingleTableConfig,
  createStandardMultiTableConfig,
  createStandardSingleTableConfig
} from '../../../src/lib'

test('createMinimumSingleTableConfig', () => {
  expect(createMinimumSingleTableConfig('testTable', { pk: 'TESTPK' })).toEqual({
    tableName: 'testTable',
    metaAttributeNames: {
      pk: 'TESTPK'
    }
  })
})

test('createStandardSingleTableConfig', () => {
  expect(createStandardSingleTableConfig('testTable')).toEqual({
    tableName: 'testTable',
    allowScans: false,
    metaAttributeNames: {
      pk: 'PK',
      sk: 'SK',
      ttl: 'ttl',
      entityType: '_et',
      lastUpdated: '_lastUpdated',
      gsisById: {
        gsi: {
          pk: 'GSIPK',
          sk: 'GSISK'
        }
      }
    },
    gsiNames: {
      gsi: 'GSI'
    }
  })
})

test('createStandardMultiTableConfigWithDefaultTable', () => {
  expect(
    createStandardMultiTableConfig(
      { table1: ['table1Entity1', 'table1Entity2'], table2: ['table2Entity'] },
      'table1'
    )
  ).toEqual({
    defaultTableName: 'table1',
    entityTables: [
      {
        entityTypes: ['table1Entity1', 'table1Entity2'],
        tableName: 'table1',
        allowScans: false,
        metaAttributeNames: {
          pk: 'PK',
          sk: 'SK',
          ttl: 'ttl',
          entityType: '_et',
          lastUpdated: '_lastUpdated',
          gsisById: {
            gsi: {
              pk: 'GSIPK',
              sk: 'GSISK'
            }
          }
        },
        gsiNames: {
          gsi: 'GSI'
        }
      },
      {
        entityTypes: ['table2Entity'],
        tableName: 'table2',
        allowScans: false,
        metaAttributeNames: {
          pk: 'PK',
          sk: 'SK',
          ttl: 'ttl',
          entityType: '_et',
          lastUpdated: '_lastUpdated',
          gsisById: {
            gsi: {
              pk: 'GSIPK',
              sk: 'GSISK'
            }
          }
        },
        gsiNames: {
          gsi: 'GSI'
        }
      }
    ]
  })
})

test('createStandardMultiTableConfigWithoutDefaultTable', () => {
  expect(
    createStandardMultiTableConfig({ table1: ['table1Entity1', 'table1Entity2'], table2: ['table2Entity'] })
  ).toEqual({
    entityTables: [
      {
        entityTypes: ['table1Entity1', 'table1Entity2'],
        tableName: 'table1',
        allowScans: false,
        metaAttributeNames: {
          pk: 'PK',
          sk: 'SK',
          ttl: 'ttl',
          entityType: '_et',
          lastUpdated: '_lastUpdated',
          gsisById: {
            gsi: {
              pk: 'GSIPK',
              sk: 'GSISK'
            }
          }
        },
        gsiNames: {
          gsi: 'GSI'
        }
      },
      {
        entityTypes: ['table2Entity'],
        tableName: 'table2',
        allowScans: false,
        metaAttributeNames: {
          pk: 'PK',
          sk: 'SK',
          ttl: 'ttl',
          entityType: '_et',
          lastUpdated: '_lastUpdated',
          gsisById: {
            gsi: {
              pk: 'GSIPK',
              sk: 'GSISK'
            }
          }
        },
        gsiNames: {
          gsi: 'GSI'
        }
      }
    ]
  })
})

test('createStandardMultiTableConfigWithoutBadDefaultTable', () => {
  expect(() => createStandardMultiTableConfig({ table1: ['table1Entity1'] }, 'badDefault')).toThrowError(
    'Default table badDefault is not included in list of tables'
  )
})
