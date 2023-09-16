import { expect, test } from 'vitest'
import { typePredicateParser } from '../../../src/lib/support/entitySupport'
import { isSheep } from '../../examples/sheepTypeAndEntity'

test('typePredicateParser', () => {
  const parser = typePredicateParser(isSheep, 'sheep')

  expect(
    parser(
      { PK: 'aa', SK: 'bb', _et: 'cc', breed: 'merino', name: 'shaun', ageInYears: 4 },
      ['PK', 'SK', '_et'],
      {
        pk: 'PK',
        sk: 'SK',
        entityType: '_et'
      }
    )
  ).toEqual({
    breed: 'merino',
    name: 'shaun',
    ageInYears: 4
  })

  expect(() =>
    parser({ PK: 'aa', SK: 'bb', _et: 'cc', name: 'shaun', ageInYears: 4 }, ['PK'], {
      pk: 'PK'
    })
  ).toThrowError('Failed to parse entity to type sheep')
})
