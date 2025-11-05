import { DynamoDBValues, MetaAttributeNames } from '../../src/lib/entities.js'
import { entityFromPkOnlyEntity, getPKValue, keyOnlyFormatter } from '../../src/lib/support/entitySupport.js'

export interface Farm {
  name: string
}

export const FARM_ENTITY = entityFromPkOnlyEntity({
  type: 'farm',
  parse: (item: DynamoDBValues, _: string[], metaAttributeNames: MetaAttributeNames): Farm => ({
    // TODO - getPKValue returns 'any' - can we do better?
    name: getPKValue(item, metaAttributeNames)
  }),
  convertToDynamoFormat: keyOnlyFormatter,
  pk({ name }: Pick<Farm, 'name'>): string {
    return name
  }
})
