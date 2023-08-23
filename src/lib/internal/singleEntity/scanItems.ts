import { EntityContext } from '../entityContext'
import { QueryAndScanOptions } from '../../operationOptions'
import { CollectionResponse } from '../../operationResponses'
import { parseResultsForEntity, executeQueryOrScan } from '../common/queryAndScanCommon'
import { configureScanOperation } from '../common/scanCommon'

export async function scanItems<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  options: QueryAndScanOptions
): Promise<CollectionResponse<TItem>> {
  const scanConfig = configureScanOperation(context, options)
  const result = await executeQueryOrScan(scanConfig, context.logger, context.entity.type)
  return parseResultsForEntity(context, result)
}
