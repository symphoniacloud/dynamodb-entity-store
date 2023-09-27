import {
  expressionAttributeParamsFromOptions,
  keyParamFromSource,
  tableNameParam
} from '../common/operationsCommon'
import { EntityContext } from '../entityContext'
import { DynamoDBValues } from '../../entities'
import { TransactionConditionCheckOptions } from '../../transactionOperations'

export interface ConditionCheckParams {
  Key: DynamoDBValues
  TableName: string
  ConditionExpression: string
  ExpressionAttributeNames?: Record<string, string>
  ExpressionAttributeValues?: DynamoDBValues
}

export function createTransactionConditionCheck<
  TItem extends TPKSource & TSKSource,
  TKeySource extends TPKSource & TSKSource,
  TPKSource,
  TSKSource
>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  keySource: TKeySource,
  options: TransactionConditionCheckOptions
): ConditionCheckParams {
  return {
    ConditionExpression: options.conditionExpression,
    ...tableNameParam(context),
    ...keyParamFromSource(context, keySource),
    ...expressionAttributeParamsFromOptions(options)
  }
}
