import { expect, test } from 'vitest'
import { putItem } from '../../../src/lib/internal/singleEntity/putItem'
import { SHEEP_ENTITY } from '../../examples/sheepTypeAndEntity'
import { Chicken, CHICKEN_ENTITY } from '../../examples/chickenTypeAndEntity'
import { FakeClock } from '../fakes/fakeClock'
import { METADATA } from '../fakes/fakeDynamoDBInterface'
import { FARM_ENTITY } from '../../examples/farmTypeAndEntity'
import { fakeLogger } from '../fakes/fakeLogger'
import { SingleGSIStandardMetaAttributeNames } from '../../../src/lib/support/configSupport'
import { bareBonesContext, contextFor, fakeDynamoDBFrom } from '../testSupportCode/entityContextSupport'
import { gsiAttributes, putParams, ttlAttribute } from '../../../src/lib/internal/common/putCommon'

const shaunTheSheep = { breed: 'merino', name: 'shaun', ageInYears: 3 }
const ginger: Chicken = {
  breed: 'sussex',
  name: 'ginger',
  dateOfBirth: '2021-07-01',
  coop: 'bristol'
}

test('basicPutParams', () => {
  expect(putParams(contextFor(SHEEP_ENTITY), shaunTheSheep)).toEqual({
    TableName: 'testTable',
    Item: {
      PK: 'SHEEP#BREED#merino',
      SK: 'NAME#shaun',
      _et: 'sheep',
      _lastUpdated: '2023-07-01T19:00:00.000Z',
      breed: 'merino',
      name: 'shaun',
      ageInYears: 3
    }
  })
})

test('gsis', () => {
  expect(gsiAttributes(SingleGSIStandardMetaAttributeNames, SHEEP_ENTITY, shaunTheSheep)).toEqual({})
  expect(gsiAttributes(SingleGSIStandardMetaAttributeNames, CHICKEN_ENTITY, ginger)).toEqual({
    GSIPK: 'COOP#bristol',
    GSISK: 'CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01'
  })
})

test('set ttl', () => {
  expect(putParams(contextFor(SHEEP_ENTITY), shaunTheSheep, { ttl: 100 }).Item?.['ttl']).toEqual(100)
  expect(putParams(contextFor(SHEEP_ENTITY), shaunTheSheep, { ttlInFutureDays: 10 }).Item?.['ttl']).toEqual(
    1689102000
  )
})

test('ttl attribute', () => {
  const clock = new FakeClock()

  expect(ttlAttribute(clock, undefined, { ttl: 100 })).toEqual({})
  expect(ttlAttribute(clock, 'ttl', undefined)).toEqual({})
  expect(ttlAttribute(clock, 'ttl', {})).toEqual({})
  expect(ttlAttribute(clock, 'ttl', { ttl: 100 })).toEqual({ ttl: 100 })
  expect(ttlAttribute(clock, 'ttl', { ttlInFutureDays: 10 })).toEqual({ ttl: 1689102000 })
  expect(ttlAttribute(clock, 'ttl', { ttl: 100, ttlInFutureDays: 10 })).toEqual({ ttl: 100 })
})

test('override standard attribute names', () => {
  const context = {
    ...contextFor(SHEEP_ENTITY, {
      pk: 'altPK',
      sk: 'customSK',
      ttl: 'timeToLive',
      entityType: 'ET',
      lastUpdated: 'LastUpdated'
    })
  }

  expect(putParams(context, shaunTheSheep)).toEqual({
    TableName: 'testTable',
    Item: {
      altPK: 'SHEEP#BREED#merino',
      customSK: 'NAME#shaun',
      ET: 'sheep',
      LastUpdated: '2023-07-01T19:00:00.000Z',
      breed: 'merino',
      name: 'shaun',
      ageInYears: 3
    }
  })
})

test('dont include optional attributes', () => {
  const context = {
    ...contextFor(SHEEP_ENTITY, {
      pk: 'altPK',
      sk: 'customSK'
    })
  }

  expect(putParams(context, shaunTheSheep)).toEqual({
    TableName: 'testTable',
    Item: {
      altPK: 'SHEEP#BREED#merino',
      customSK: 'NAME#shaun',
      breed: 'merino',
      name: 'shaun',
      ageInYears: 3
    }
  })
})

test('should call dynamoDB client and return result', async () => {
  // Arrange
  const context = bareBonesContext(FARM_ENTITY)
  const dynamoDB = fakeDynamoDBFrom(context)
  const expectedPutParams = {
    TableName: 'testTable',
    Item: {
      PK: 'Sunflower Farm'
    }
  }
  // Eventually do something more here when getting useful responses
  const putCommandOutput = {
    $metadata: {
      httpStatusCode: 200,
      requestId: 'ABC',
      attempts: 1,
      totalRetryDelay: 0
    }
  }
  dynamoDB.stubPuts.addResponse(expectedPutParams, putCommandOutput)

  // Act
  const putResult = await putItem(context, { name: 'Sunflower Farm' })

  // Assert
  expect(putResult).toEqual({})
  expect(dynamoDB.puts.length).toEqual(1)
  expect(dynamoDB.puts[0]).toEqual(expectedPutParams)
})

test('should call logger if debug logging enabled', async () => {
  // Turn on Debug Logging
  const logger = fakeLogger('DEBUG')
  const context = {
    ...bareBonesContext(FARM_ENTITY),
    logger
  }

  await putItem(context, { name: 'Sunflower Farm' })

  expect(logger.debugs.length).toEqual(2)
  expect(logger.debugs[0][0]).toEqual('Attempting to put farm')
  expect(logger.debugs[0][1][0]).toEqual({
    params: {
      TableName: 'testTable',
      Item: {
        PK: 'Sunflower Farm'
      }
    }
  })
  expect(logger.debugs[1][0]).toEqual('Put result')
  expect(logger.debugs[1][1][0]).toEqual({ result: METADATA })
})

test('should not call logger if debug logging disabled', async () => {
  // Turn off Debug Logging
  const logger = fakeLogger('SILENT')
  const context = {
    ...bareBonesContext(FARM_ENTITY),
    logger
  }

  await putItem(context, { name: 'Sunflower Farm' })

  expect(logger.debugs.length).toEqual(0)
})
