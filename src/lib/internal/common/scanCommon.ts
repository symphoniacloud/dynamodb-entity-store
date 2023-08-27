import { EntityContext } from '../entityContext'
import { configureOperation, QueryScanOperationConfiguration } from './queryAndScanCommon'
import { ScanCommandInput, ScanCommandOutput } from '@aws-sdk/lib-dynamodb'
import { QueryAndScanOptions } from '../../multipleEntityOperations'

export function configureScanOperation(
  { dynamoDB, tableName }: Pick<EntityContext<never, never, never>, 'tableName' | 'dynamoDB'>,
  options: QueryAndScanOptions,
  allPages: boolean
): QueryScanOperationConfiguration<ScanCommandInput, ScanCommandOutput> {
  return {
    ...configureOperation(tableName, options, allPages, undefined),
    allPageOperation: dynamoDB.scanAllPages,
    onePageOperation: dynamoDB.scanOnePage
  }
}
