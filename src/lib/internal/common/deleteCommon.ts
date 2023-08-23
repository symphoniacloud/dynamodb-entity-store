// Also used for generating transaction delete items
import { EntityContext } from '../entityContext'
import { DeleteOptions } from '../../operationOptions'
import {
  conditionExpressionParam,
  expressionAttributeParamsFromOptions,
  keyParamFromSource,
  returnParamsForCapacityMetricsAndValues,
  tableNameParam
} from '../operationsCommon'

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
    ...expressionAttributeParamsFromOptions(options),
    ...returnParamsForCapacityMetricsAndValues(options)
  }
}
