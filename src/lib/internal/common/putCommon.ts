import { Clock } from '../../util/index.js'
import {
  conditionExpressionParam,
  createKeyFromSource,
  determineTTL,
  expressionAttributeParamsFromOptions,
  tableNameParam
} from './operationsCommon.js'
import { EntityContext } from '../entityContext.js'
import { DynamoDBValues, Entity, MetaAttributeNames } from '../../entities.js'
import { Mandatory } from '../../util/index.js'
import { PutCommandInput } from '@aws-sdk/lib-dynamodb'
import { PutOptions } from '../../singleEntityOperations.js'

// Also used for generating transaction put items
export function putParams<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  item: TItem,
  options?: PutOptions
): PutCommandInput {
  return {
    ...tableNameParam(context),
    ...conditionExpressionParam(options),
    ...expressionAttributeParamsFromOptions(options),
    ...itemParam(context, item, options)
    // ...returnParamsForCapacityMetricsAndValues(options)
  }
}

export function itemParam<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  item: TItem,
  options?: PutOptions
): { Item: DynamoDBValues } {
  const { entity, clock } = context
  return {
    Item: {
      ...createKeyFromSource(context, item),
      ...gsiAttributes(context.metaAttributeNames, entity, item),
      ...(context.metaAttributeNames.entityType
        ? { [context.metaAttributeNames.entityType]: entity.type }
        : {}),
      ...(context.metaAttributeNames.lastUpdated
        ? { [context.metaAttributeNames.lastUpdated]: clock.now().toISOString() }
        : {}),
      ...ttlAttribute(clock, context.metaAttributeNames.ttl, options),
      ...(entity.convertToDynamoFormat ? entity.convertToDynamoFormat(item) : item)
    } as DynamoDBValues
  }
}

export function ttlAttribute(clock: Clock, attributeName?: string, options?: PutOptions) {
  if (attributeName) {
    const ttlValue = determineTTL(clock, options)
    if (ttlValue) {
      return { [attributeName]: ttlValue }
    }
  }
  return {}
}

export function gsiAttributes<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  metaAttributeNames: Mandatory<MetaAttributeNames, 'gsisById'>,
  entity: Entity<TItem, TPKSource, TSKSource>,
  item: TItem
) {
  return Object.entries(entity.gsis ?? {}).reduce((accum, [id, gsi]) => {
    const attributeNamesForID = metaAttributeNames.gsisById[id]
    if (!attributeNamesForID) throw new Error(`Unable to find GSI attribute names for GSI ID ${id}`)

    function gsiSK() {
      const skAttributeName = attributeNamesForID.sk
      if (!skAttributeName) return {}
      if (!gsi.sk)
        throw new Error(
          `Sort key attribute exists on table GSI for GSI ID ${id} but no GSI SK generator exists on entity type ${entity.type} for same GSI ID`
        )
      return {
        [skAttributeName]: gsi.sk(item)
      }
    }

    return {
      ...accum,
      [attributeNamesForID.pk]: gsi.pk(item),
      ...gsiSK()
    }
  }, {})
}
