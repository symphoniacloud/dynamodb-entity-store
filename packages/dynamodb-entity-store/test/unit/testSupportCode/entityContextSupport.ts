import { createStandardSingleTableConfig, Entity, MetaAttributeNames, noopLogger } from '../../../src/lib/index.js'
import { createEntityContext, EntityContext } from '../../../src/lib/internal/entityContext.js'
import { FakeDynamoDBInterface, fakeDynamoDBInterface } from './fakes/fakeDynamoDBInterface.js'
import { FakeClock } from './fakes/fakeClock.js'

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
