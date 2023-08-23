import { beforeAll, describe, expect, test } from 'vitest'
import { dynamoDbScanTable, testTableName } from '../testSupportCode/awsEnvironment'
import { Sheep } from '../../examples/sheepTypeAndEntity'
import {
  Chicken,
  CHICKEN_ENTITY,
  findOlderThan,
  findYoungerThan,
  gsiBreed
} from '../../examples/chickenTypeAndEntity'
import { SingleEntityOperations } from '../../../src/lib/singleEntityOperations'
import { docClient, initialize } from '../testSupportCode/appEnvironment'
import { babs, bunty, cluck, ginger, yolko } from '../../examples/testData'

describe('chickens', () => {
  test('basic operations', async () => {
    const chickenStore = (await initialize()).for(CHICKEN_ENTITY)
    await chickenStore.put(ginger)

    const items = await dynamoDbScanTable(testTableName, docClient)
    expect(items.length).toEqual(1)
    expect(items[0]).toEqual({
      PK: 'CHICKEN#BREED#sussex',
      SK: 'DATEOFBIRTH#2021-07-01#NAME#ginger',
      GSIPK: 'COOP#bristol',
      GSISK: 'CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01',
      _et: 'chicken',
      _lastUpdated: '2023-07-01T19:00:00.000Z',
      ...ginger
    })

    expect(
      await chickenStore.getOrUndefined({ breed: 'sussex', name: 'ginger', dateOfBirth: '2021-07-01' })
    ).toEqual({ item: ginger })
    expect(
      (await chickenStore.getOrUndefined({ breed: 'sussex', name: 'babs', dateOfBirth: '2021-09-01' })).item
    ).toBeUndefined()
  })

  describe('queries', () => {
    let chickenStore: SingleEntityOperations<Chicken, Pick<Sheep, 'breed'>, Pick<Sheep, 'name'>>
    beforeAll(async () => {
      chickenStore = (await initialize()).for(CHICKEN_ENTITY)

      await chickenStore.put(ginger)
      await chickenStore.put(babs)
      await chickenStore.put(bunty)
      await chickenStore.put(yolko)
      await chickenStore.put(cluck)
    })

    test('queryByPk', async () => {
      const result = await chickenStore.query({}).byPk({ breed: 'sussex' })
      const chickens = result.items
      expect(chickens).toContainEqual(ginger)
      expect(chickens).toContainEqual(babs)
      expect(chickens).toContainEqual(bunty)
      expect(chickens).toContainEqual(yolko)
      expect(chickens.length).toEqual(4)
    })

    test('queryByPkAndSk', async () => {
      const olderResult = await chickenStore
        .query({})
        .byPkAndSk({ breed: 'sussex' }, findOlderThan('2021-10-01'))
      const olderChickens = olderResult.items
      expect(olderChickens.length).toEqual(3)
      expect(olderChickens[0]).toEqual(yolko)
      expect(olderChickens[1]).toEqual(ginger)
      expect(olderChickens[2]).toEqual(babs)

      // Get youngest (latest in SK) first
      const youngerResult = await chickenStore
        .query({ scanIndexForward: false })
        .byPkAndSk({ breed: 'sussex' }, findYoungerThan('2021-08-01'))
      const youngerChickens = youngerResult.items
      expect(youngerChickens.length).toEqual(2)
      expect(youngerChickens[0]).toEqual(bunty)
      expect(youngerChickens[1]).toEqual(babs)
    })

    test('queryByGsiPk', async () => {
      const result = await chickenStore.queryWithGsi().byPk({ coop: 'dakota' })
      const chickens = result.items
      expect(chickens).toContainEqual(yolko)
      expect(chickens).toContainEqual(cluck)
      expect(chickens.length).toEqual(2)
    })

    test('queryByGsiPkAndSk', async () => {
      const result = await chickenStore.queryWithGsi().byPkAndSk({ coop: 'dakota' }, gsiBreed('orpington'))
      const chickens = result.items
      expect(chickens).toContainEqual(cluck)
      expect(chickens.length).toEqual(1)
    })
  })
})
