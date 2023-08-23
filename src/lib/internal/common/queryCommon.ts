import { EntityContext } from '../entityContext'
import { QueryAndScanOptions } from '../../operationOptions'
import { configureOperation, QueryScanOperationConfiguration } from './queryAndScanCommon'
import { QueryCommandInput, QueryCommandOutput } from '@aws-sdk/lib-dynamodb'

export function configureQueryOperation(
  { dynamoDB, tableName }: Pick<EntityContext<never, never, never>, 'tableName' | 'dynamoDB'>,
  options: QueryAndScanOptions,
  queryParamsParts?: Omit<QueryCommandInput, 'TableName' | 'ExclusiveStartKey' | 'Limit'>
): QueryScanOperationConfiguration<QueryCommandInput, QueryCommandOutput> {
  return {
    ...configureOperation(tableName, options, queryParamsParts),
    allPageOperation: dynamoDB.queryAllPages,
    onePageOperation: dynamoDB.queryOnePage
  }
}
