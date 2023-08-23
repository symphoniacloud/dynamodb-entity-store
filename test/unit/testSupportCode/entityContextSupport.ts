import { Entity, MetaAttributeNames } from '../../../src/lib/entities'
import { createEntityContext, EntityContext } from '../../../src/lib/internal/entityContext'
import {
  createStandardTable,
  MinimumMetaAttributeNamesWithStandardPK
} from '../../../src/lib/support/configSupport'
import { FakeDynamoDBInterface, fakeDynamoDBInterface } from '../fakes/fakeDynamoDBInterface'
import { FakeClock } from '../fakes/fakeClock'
import { noopLogger } from '../../../src/lib/util/logger'

export function contextFor<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  entity: Entity<TItem, TPKSource, TSKSource>,
  customMetaAttributeNames?: MetaAttributeNames
): EntityContext<TItem, TPKSource, TSKSource> {
  return createEntityContext(
    {
      ...createStandardTable('testTable'),
      dynamoDB: fakeDynamoDBInterface(),
      clock: new FakeClock(),
      logger: noopLogger,
      allowScans: false,
      ...(customMetaAttributeNames ? { metaAttributeNames: customMetaAttributeNames } : {})
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
  return contextFor(entity, MinimumMetaAttributeNamesWithStandardPK)
}
