// Also used for generating transaction delete items
import { EntityContext } from '../entityContext'
import {
  conditionExpressionParam,
  expressionAttributeParamsFromOptions,
  keyParamFromSource,
  returnParamsForCapacityMetricsAndValues,
  tableNameParam
} from '../operationsCommon'
import { AdvancedDeleteOptions } from '../../advanced/advancedOperationOptions'
import { DeleteOptions } from '../../singleEntityOperations'

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

export function advancedDeleteParams<
  TItem extends TPKSource & TSKSource,
  TKeySource extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  keySource: TKeySource,
  options?: AdvancedDeleteOptions
) {
  return {
    ...deleteParams(context, keySource, options),
    ...returnParamsForCapacityMetricsAndValues(options)
  }
}
