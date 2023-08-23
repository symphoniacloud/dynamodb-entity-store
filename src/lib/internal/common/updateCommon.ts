// Also used for generating transaction update items
import { ContextMetaAttributeNames, EntityContext } from '../entityContext'
import { UpdateOptions } from '../../operationOptions'
import { Mandatory } from '../../util/types'
import {
  conditionExpressionParam,
  determineTTL,
  expressionAttributeParamsFromOptions,
  keyParamFromSource,
  returnParamsForCapacityMetricsAndValues,
  tableNameParam
} from '../operationsCommon'
import { UpdateCommandInput } from '@aws-sdk/lib-dynamodb'

export function createUpdateParams<
  TItem extends TPKSource & TSKSource,
  TKeySource extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  keySource: TKeySource,
  options: UpdateOptions
): Mandatory<UpdateCommandInput, 'UpdateExpression'> {
  return {
    ...tableNameParam(context),
    ...keyParamFromSource(context, keySource),
    ...updateExpressionParam(context, options),
    ...conditionExpressionParam(options),
    ...expressionAttributeParamsFromOptions(
      withTTLAttributeIfRelevant(context, withLastUpdatedAttributeIfRelevant(context, options))
    ),
    ...returnParamsForCapacityMetricsAndValues(options)
  }
}

function updateExpressionParam<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  options: UpdateOptions
) {
  return {
    UpdateExpression: joinNonEmpty(
      [
        createSetClause(context, options),
        createClause('REMOVE', options.update?.remove),
        createClause('ADD', options.update?.add),
        createClause('DELETE', options.update?.delete)
      ],
      ' '
    )
  }
}

const LAST_UPDATED_EXPRESSION_ATTRIBUTE_NAME = '#lastUpdated'
const LAST_UPDATED_EXPRESSION_ATTRIBUTE_VALUE = ':newLastUpdated'
const SET_NEW_LAST_UPDATED = `${LAST_UPDATED_EXPRESSION_ATTRIBUTE_NAME} = ${LAST_UPDATED_EXPRESSION_ATTRIBUTE_VALUE}`
const TTL_EXPRESSION_ATTRIBUTE_NAME = '#ttl'
const TTL_EXPRESSION_ATTRIBUTE_VALUE = ':newTTL'
const SET_NEW_TTL = `${TTL_EXPRESSION_ATTRIBUTE_NAME} = ${TTL_EXPRESSION_ATTRIBUTE_VALUE}`

function createSetClause<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  options: UpdateOptions
) {
  const lastUpdatedAttributeName = context.metaAttributeNames.lastUpdated
  return createClause(
    'SET',
    joinNonEmpty(
      [
        options.update?.set,
        lastUpdatedAttributeName ? SET_NEW_LAST_UPDATED : '',
        resetTTL(context.metaAttributeNames, options) ? SET_NEW_TTL : ''
      ],
      ', '
    )
  )
}

function resetTTL(metaAttributeNames: ContextMetaAttributeNames, { ttl, ttlInFutureDays }: UpdateOptions) {
  return metaAttributeNames.ttl && (ttl !== undefined || ttlInFutureDays !== undefined)
}

function joinNonEmpty(arr: Array<string | undefined>, separator: string) {
  return arr.filter((x) => x && x.length > 1).join(separator)
}

function createClause(operator: string, element: string | undefined) {
  return element && element.length > 0 ? `${operator} ${element}` : ''
}

function withLastUpdatedAttributeIfRelevant<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  options: UpdateOptions
): UpdateOptions {
  const lastUpdatedAttributeName = context.metaAttributeNames.lastUpdated
  if (lastUpdatedAttributeName === undefined) return options
  return {
    ...options,
    expressionAttributeNames: {
      ...(options.expressionAttributeNames ?? {}),
      [LAST_UPDATED_EXPRESSION_ATTRIBUTE_NAME]: lastUpdatedAttributeName
    },
    expressionAttributeValues: {
      ...options.expressionAttributeValues,
      [LAST_UPDATED_EXPRESSION_ATTRIBUTE_VALUE]: context.clock.now().toISOString()
    }
  }
}

function withTTLAttributeIfRelevant<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  options: UpdateOptions
): UpdateOptions {
  const ttlAttributeName = context.metaAttributeNames.ttl
  if (!(ttlAttributeName && resetTTL(context.metaAttributeNames, options))) return options
  return {
    ...options,
    expressionAttributeNames: {
      ...(options.expressionAttributeNames ?? {}),
      [TTL_EXPRESSION_ATTRIBUTE_NAME]: ttlAttributeName
    },
    expressionAttributeValues: {
      ...options.expressionAttributeValues,
      [TTL_EXPRESSION_ATTRIBUTE_VALUE]: determineTTL(context.clock, options)
    }
  }
}
