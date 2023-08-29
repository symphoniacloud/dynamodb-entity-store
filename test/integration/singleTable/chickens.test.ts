import { beforeAll, describe, expect, test } from 'vitest'
import { dynamoDbScanTable, testTableName } from '../testSupportCode/awsEnvironment'
import {
  Chicken,
  CHICKEN_ENTITY,
  findOlderThan,
  findYoungerThan,
  gsiBreed
} from '../../examples/chickenTypeAndEntity'
import { SingleEntityOperations } from '../../../src/lib'
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
    ).toEqual(ginger)
    expect(
      await chickenStore.getOrUndefined({ breed: 'sussex', name: 'babs', dateOfBirth: '2021-09-01' })
    ).toBeUndefined()
  })

  describe('queries', () => {
    let chickenStore: SingleEntityOperations<
      Chicken,
      Pick<Chicken, 'breed'>,
      Pick<Chicken, 'name' | 'dateOfBirth'>
    >
    beforeAll(async () => {
      chickenStore = (await initialize()).for(CHICKEN_ENTITY)

      await chickenStore.put(ginger)
      await chickenStore.put(babs)
      await chickenStore.put(bunty)
      await chickenStore.put(yolko)
      await chickenStore.put(cluck)
    })

    test('queryByPk', async () => {
      const result = await chickenStore.queryOnePageByPk({ breed: 'sussex' })
      expect(result.items).toEqual([yolko, ginger, babs, bunty])
    })

    test('queryByPkAndSk', async () => {
      const olderResult = await chickenStore.queryOnePageByPkAndSk(
        { breed: 'sussex' },
        findOlderThan('2021-10-01')
      )
      expect(olderResult.items).toEqual([yolko, ginger, babs])

      // Get youngest (latest in SK) first
      const youngerResult = await chickenStore.queryOnePageByPkAndSk(
        { breed: 'sussex' },
        findYoungerThan('2021-08-01'),
        { scanIndexForward: false }
      )
      expect(youngerResult.items).toEqual([bunty, babs])
    })

    // TODO - test one page
    test('queryByGsiPk', async () => {
      const chickens = await chickenStore.queryAllWithGsiByPk({ coop: 'dakota' })
      expect(chickens).toEqual([cluck, yolko])
    })

    // TODO - test one page
    test('queryByGsiPkAndSk', async () => {
      const result = await chickenStore.queryAllWithGsiByPkAndSk({ coop: 'dakota' }, gsiBreed('orpington'))
      expect(result).toEqual([cluck])
    })
  })
})
