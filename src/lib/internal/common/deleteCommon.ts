import { EntityContext } from '../entityContext.js'
import {
  conditionExpressionParam,
  expressionAttributeParamsFromOptions,
  keyParamFromSource,
  tableNameParam
} from './operationsCommon.js'
import { DeleteOptions } from '../../singleEntityOperations.js'

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
