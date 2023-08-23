import { EntityContext } from '../entityContext'
import { QueryAndScanOptions } from '../../operationOptions'
import { configureOperation, QueryScanOperationConfiguration } from './queryAndScanCommon'
import { ScanCommandInput, ScanCommandOutput } from '@aws-sdk/lib-dynamodb'

export function configureScanOperation(
  { dynamoDB, tableName }: Pick<EntityContext<never, never, never>, 'tableName' | 'dynamoDB'>,
  options: QueryAndScanOptions
): QueryScanOperationConfiguration<ScanCommandInput, ScanCommandOutput> {
  return {
    ...configureOperation(tableName, options),
    allPageOperation: dynamoDB.scanAllPages,
    onePageOperation: dynamoDB.scanOnePage
  }
}
