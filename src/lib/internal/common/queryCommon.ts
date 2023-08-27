import { EntityContext } from '../entityContext'
import { configureOperation, QueryScanOperationConfiguration } from './queryAndScanCommon'
import { QueryCommandInput, QueryCommandOutput } from '@aws-sdk/lib-dynamodb'
import { QueryAndScanOptions } from '../../multipleEntityOperations'

export function configureQueryOperation(
  { dynamoDB, tableName }: Pick<EntityContext<never, never, never>, 'tableName' | 'dynamoDB'>,
  options: QueryAndScanOptions,
  allPages: boolean,
  queryParamsParts?: Omit<QueryCommandInput, 'TableName' | 'ExclusiveStartKey' | 'Limit'>
): QueryScanOperationConfiguration<QueryCommandInput, QueryCommandOutput> {
  return {
    ...configureOperation(tableName, options, allPages, queryParamsParts),
    allPageOperation: dynamoDB.queryAllPages,
    onePageOperation: dynamoDB.queryOnePage
  }
}
