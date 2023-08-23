import { expect, test, describe } from 'vitest'
import { SHEEP_ENTITY } from '../../examples/sheepTypeAndEntity'
import { excludeKeys } from '../../../src/lib/util/collections'
import { SingleGSIStandardMetaAttributeNames } from '../../../src/lib/support/configSupport'
import { contextFor } from '../testSupportCode/entityContextSupport'
import { createUpdateParams } from '../../../src/lib/internal/common/updateCommon'

const shaunIdentifier = { breed: 'merino', name: 'shaun' }

const sheepContext = contextFor(SHEEP_ENTITY)
const sheepContextWithoutLastUpdated = contextFor(
  SHEEP_ENTITY,
  excludeKeys(SingleGSIStandardMetaAttributeNames, ['lastUpdated'])
)

describe('createUpdateParams', () => {
  test('simple SET update with standard table attributes', () => {
    expect(
      createUpdateParams(sheepContext, shaunIdentifier, {
        update: {
          set: 'ageInYears = :newAge'
        },
        expressionAttributeValues: {
          ':newAge': 4
        }
      })
    ).toEqual({
      TableName: 'testTable',
      Key: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      UpdateExpression: 'SET ageInYears = :newAge, #lastUpdated = :newLastUpdated',
      ExpressionAttributeNames: {
        '#lastUpdated': '_lastUpdated'
      },
      ExpressionAttributeValues: {
        ':newAge': 4,
        ':newLastUpdated': '2023-07-01T19:00:00.000Z'
      }
    })
  })

  test('Dont set lastupdated if not in metadata', () => {
    expect(
      createUpdateParams(sheepContextWithoutLastUpdated, shaunIdentifier, {
        update: {
          set: 'ageInYears = :newAge'
        },
        expressionAttributeValues: {
          ':newAge': 4
        }
      })
    ).toEqual({
      TableName: 'testTable',
      Key: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      UpdateExpression: 'SET ageInYears = :newAge',
      ExpressionAttributeValues: {
        ':newAge': 4
      }
    })
  })

  test('ADD', () => {
    expect(
      createUpdateParams(sheepContext, shaunIdentifier, {
        update: {
          add: 'Color :c'
        },
        expressionAttributeValues: {
          ':c': new Set(['Orange', 'Purple'])
        }
      })
    ).toEqual({
      TableName: 'testTable',
      Key: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      UpdateExpression: 'SET #lastUpdated = :newLastUpdated ADD Color :c',
      ExpressionAttributeNames: {
        '#lastUpdated': '_lastUpdated'
      },
      ExpressionAttributeValues: {
        ':c': new Set(['Orange', 'Purple']),
        ':newLastUpdated': '2023-07-01T19:00:00.000Z'
      }
    })
  })

  test('ADD without lastUpdated', () => {
    expect(
      createUpdateParams(sheepContextWithoutLastUpdated, shaunIdentifier, {
        update: {
          add: 'Color :c'
        },
        expressionAttributeValues: {
          ':c': new Set(['Orange', 'Purple'])
        }
      })
    ).toEqual({
      TableName: 'testTable',
      Key: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      UpdateExpression: 'ADD Color :c',
      ExpressionAttributeValues: {
        ':c': new Set(['Orange', 'Purple'])
      }
    })
  })

  test('REMOVE', () => {
    expect(
      createUpdateParams(sheepContext, shaunIdentifier, {
        update: {
          remove: 'Color'
        }
      })
    ).toEqual({
      TableName: 'testTable',
      Key: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      UpdateExpression: 'SET #lastUpdated = :newLastUpdated REMOVE Color',
      ExpressionAttributeNames: {
        '#lastUpdated': '_lastUpdated'
      },
      ExpressionAttributeValues: {
        ':newLastUpdated': '2023-07-01T19:00:00.000Z'
      }
    })
  })

  test('DELETE', () => {
    expect(
      createUpdateParams(sheepContext, shaunIdentifier, {
        update: {
          delete: 'Color :c'
        },
        expressionAttributeValues: {
          ':c': new Set(['Orange', 'Purple'])
        }
      })
    ).toEqual({
      TableName: 'testTable',
      Key: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      UpdateExpression: 'SET #lastUpdated = :newLastUpdated DELETE Color :c',
      ExpressionAttributeNames: {
        '#lastUpdated': '_lastUpdated'
      },
      ExpressionAttributeValues: {
        ':c': new Set(['Orange', 'Purple']),
        ':newLastUpdated': '2023-07-01T19:00:00.000Z'
      }
    })
  })

  test('All elements', () => {
    expect(
      createUpdateParams(sheepContext, shaunIdentifier, {
        update: {
          set: 'ageInYears = :newAge',
          remove: 'description',
          add: 'highlights :h',
          delete: 'Color :c'
        },
        expressionAttributeValues: {
          ':newAge': 4,
          ':h': new Set(['yellow']),
          ':c': new Set(['Orange', 'Purple'])
        }
      })
    ).toEqual({
      TableName: 'testTable',
      Key: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      UpdateExpression:
        'SET ageInYears = :newAge, #lastUpdated = :newLastUpdated REMOVE description ADD highlights :h DELETE Color :c',
      ExpressionAttributeNames: {
        '#lastUpdated': '_lastUpdated'
      },
      ExpressionAttributeValues: {
        ':newAge': 4,
        ':h': new Set(['yellow']),
        ':c': new Set(['Orange', 'Purple']),
        ':newLastUpdated': '2023-07-01T19:00:00.000Z'
      }
    })
  })

  test('with condition', () => {
    expect(
      createUpdateParams(sheepContext, shaunIdentifier, {
        update: {
          set: 'ageInYears = :newAge'
        },
        conditionExpression: '#ageInYears < :invalidAge',
        expressionAttributeNames: {
          '#ageInYears': 'ageInYears'
        },
        expressionAttributeValues: {
          ':invalidAge': 3,
          ':newAge': 3
        }
      })
    ).toEqual({
      TableName: 'testTable',
      Key: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      UpdateExpression: 'SET ageInYears = :newAge, #lastUpdated = :newLastUpdated',
      ConditionExpression: '#ageInYears < :invalidAge',
      ExpressionAttributeNames: {
        '#lastUpdated': '_lastUpdated',
        '#ageInYears': 'ageInYears'
      },
      ExpressionAttributeValues: {
        ':invalidAge': 3,
        ':newAge': 3,
        ':newLastUpdated': '2023-07-01T19:00:00.000Z'
      }
    })
  })

  test('reset lastupdated, and TTL if specified', () => {
    expect(
      createUpdateParams(sheepContext, shaunIdentifier, {
        update: {
          set: 'ageInYears = :newAge'
        },
        expressionAttributeValues: {
          ':newAge': 4
        },
        ttl: 100
      })
    ).toEqual({
      TableName: 'testTable',
      Key: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      UpdateExpression: 'SET ageInYears = :newAge, #lastUpdated = :newLastUpdated, #ttl = :newTTL',
      ExpressionAttributeNames: {
        '#lastUpdated': '_lastUpdated',
        '#ttl': 'ttl'
      },
      ExpressionAttributeValues: {
        ':newAge': 4,
        ':newLastUpdated': '2023-07-01T19:00:00.000Z',
        ':newTTL': 100
      }
    })
  })

  test('be able to reset TTL without any other field updates', () => {
    expect(
      createUpdateParams(sheepContext, shaunIdentifier, {
        ttl: 100
      })
    ).toEqual({
      TableName: 'testTable',
      Key: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      UpdateExpression: 'SET #lastUpdated = :newLastUpdated, #ttl = :newTTL',
      ExpressionAttributeNames: {
        '#lastUpdated': '_lastUpdated',
        '#ttl': 'ttl'
      },
      ExpressionAttributeValues: {
        ':newLastUpdated': '2023-07-01T19:00:00.000Z',
        ':newTTL': 100
      }
    })
  })

  test('Dont set lastupdated if not in metadata, but do set TTL if specified', () => {
    expect(
      createUpdateParams(sheepContextWithoutLastUpdated, shaunIdentifier, {
        update: {
          set: 'ageInYears = :newAge'
        },
        expressionAttributeValues: {
          ':newAge': 4
        },
        ttlInFutureDays: 10
      })
    ).toEqual({
      TableName: 'testTable',
      Key: {
        PK: 'SHEEP#BREED#merino',
        SK: 'NAME#shaun'
      },
      UpdateExpression: 'SET ageInYears = :newAge, #ttl = :newTTL',
      ExpressionAttributeNames: {
        '#ttl': 'ttl'
      },
      ExpressionAttributeValues: {
        ':newAge': 4,
        ':newTTL': 1689102000
      }
    })
  })
})
