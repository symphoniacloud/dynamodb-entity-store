import { createStandardSingleTableConfig, Entity, MetaAttributeNames, noopLogger } from '../../../src/lib'
import { createEntityContext, EntityContext } from '../../../src/lib/internal/entityContext'
import { FakeDynamoDBInterface, fakeDynamoDBInterface } from './fakes/fakeDynamoDBInterface'
import { FakeClock } from './fakes/fakeClock'

export function contextFor<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  entity: Entity<TItem, TPKSource, TSKSource>,
  customMetaAttributeNames?: MetaAttributeNames
): EntityContext<TItem, TPKSource, TSKSource> {
  return createEntityContext(
    {
      storeContext: {
        dynamoDB: fakeDynamoDBInterface(),
        clock: new FakeClock(),
        logger: noopLogger
      },
      table: {
        ...createStandardSingleTableConfig('testTable'),
        allowScans: false,
        ...(customMetaAttributeNames ? { metaAttributeNames: customMetaAttributeNames } : {})
      }
    },
    entity
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fakeDynamoDBFrom(context: EntityContext<any, any, any>) {
  const fakeDynamoDB = context.dynamoDB as FakeDynamoDBInterface
  if (fakeDynamoDB.stubPuts) return fakeDynamoDB
  throw new Error('DynamoDB was not fake')
}

export function bareBonesContext<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  entity: Entity<TItem, TPKSource, TSKSource>
): EntityContext<TItem, TPKSource, TSKSource> {
  return contextFor(entity, { pk: 'PK' })
}
