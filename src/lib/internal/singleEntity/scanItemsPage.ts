import { EntityContext } from '../entityContext'
import { executeQueryOrScan, parseResultsForEntity } from '../common/queryAndScanCommon'
import { configureScanOperation } from '../common/scanCommon'
import { AdvancedCollectionResponse } from '../../advanced/advancedOperationResponses'
import { ScanOnePageOptions } from '../../singleEntityOperations'

export async function scanItems<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  options: ScanOnePageOptions,
  allPages: boolean
): Promise<AdvancedCollectionResponse<TItem>> {
  const scanConfig = configureScanOperation(context, options, allPages)
  const result = await executeQueryOrScan(scanConfig, context.logger, context.entity.type)
  return parseResultsForEntity(context, result)
}
