import { EntityContext } from '../entityContext'
import {
  conditionExpressionParam,
  expressionAttributeParamsFromOptions,
  keyParamFromSource,
  tableNameParam
} from '../operationsCommon'
import { DeleteOptions } from '../../singleEntityOperations'

// Also used for generating transaction delete items
export function deleteParams<
  TItem extends TPKSource & TSKSource,
  TKeySource extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(context: EntityContext<TItem, TPKSource, TSKSource>, keySource: TKeySource, options?: DeleteOptions) {
  return {
    ...tableNameParam(context),
    ...keyParamFromSource(context, keySource),
    ...conditionExpressionParam(options),
    ...expressionAttributeParamsFromOptions(options)
  }
}
