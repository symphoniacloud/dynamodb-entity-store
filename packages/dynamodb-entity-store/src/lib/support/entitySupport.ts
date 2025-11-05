// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { excludeKeys } from '../util/collections.js'
import {
  DynamoDBValues,
  Entity,
  EntityFormatter,
  EntityParser,
  MetaAttributeNames,
  PKOnlyEntity
} from '../entities.js'
import { throwError } from '../util/errors.js'

export type TypePredicateFunction<T extends DynamoDBValues> = (o: DynamoDBValues) => o is T

export function typePredicateParser<TItem extends DynamoDBValues>(
  typePredicate: TypePredicateFunction<TItem>,
  entityType: string
): EntityParser<TItem> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (rawItem: DynamoDBValues, allMetaAttributeNames: string[]) => {
    const item = excludeKeys(rawItem, allMetaAttributeNames)
    if (typePredicate(item)) return item
    else throw new Error(`Failed to parse entity to type ${entityType}`)
  }
}

export function createEntity<TItem extends TPKSource & TSKSource & DynamoDBValues, TPKSource, TSKSource>(
  type: string,
  typePredicate: TypePredicateFunction<TItem>,
  pk: (source: TPKSource) => string,
  sk: (source: TSKSource) => string
): Entity<TItem, TPKSource, TSKSource> {
  return {
    type,
    parse: typePredicateParser(typePredicate, type),
    pk,
    sk
  }
}

export function entityFromPkOnlyEntity<TItem extends TPKSource, TPKSource>(
  pkOnlyEntity: PKOnlyEntity<TItem, TPKSource>
): Entity<TItem, TPKSource, unknown> {
  return {
    ...pkOnlyEntity,
    sk(): string {
      throw new Error(`${this.type} has no sort key`)
    }
  }
}

export const keyOnlyFormatter: EntityFormatter<unknown> = () => ({})

export function getPKValue(item: DynamoDBValues, metaAttributeNames: MetaAttributeNames) {
  const pkAttributeName = metaAttributeNames.pk
  return (
    item[pkAttributeName] ?? throwError(`Unable to find PK attribute (${pkAttributeName}) in DynamoDB item`)()
  )
}
