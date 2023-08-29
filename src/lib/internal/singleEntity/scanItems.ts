import { EntityContext } from '../entityContext'
import {
  configureScanOperation,
  executeQueryOrScan,
  parseResultsForEntity
} from '../common/queryAndScanCommon'
import { AdvancedCollectionResponse, AdvancedScanOnePageOptions } from '../../singleEntityAdvancedOperations'

export async function scanItems<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  options: AdvancedScanOnePageOptions,
  allPages: boolean
): Promise<AdvancedCollectionResponse<TItem>> {
  const scanConfig = configureScanOperation(context, options, allPages)
  const result = await executeQueryOrScan(scanConfig, context.logger, context.entity.type)
  return parseResultsForEntity(context, result)
}
