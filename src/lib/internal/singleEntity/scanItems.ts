import { EntityContext } from '../entityContext'
import {
  configureScanOperation,
  executeQueryOrScan,
  parseResultsForEntity
} from '../common/queryAndScanCommon'
import { AdvancedCollectionResponse, AdvancedScanOnePageOptions } from '../../singleEntityAdvancedOperations'
import { GsiDetails } from '../common/gsiQueryCommon'

export async function scanItems<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  options: AdvancedScanOnePageOptions,
  allPages: boolean,
  gsiDetails?: GsiDetails
): Promise<AdvancedCollectionResponse<TItem>> {
  if (context.allowScans === undefined || !context.allowScans)
    throw new Error('Scan operations are disabled for this store')

  const scanConfig = configureScanOperation(context, options, allPages, gsiDetails)
  const result = await executeQueryOrScan(scanConfig, context.logger, context.entity.type)
  return parseResultsForEntity(context, result)
}
