import { EntityContext } from '../entityContext'
import { MultipleEntityCollectionResponse } from '../../multipleEntityOperations'
import { performMultipleEntityOperationAndParse } from './multipleEntitiesQueryAndScanCommon'

import { configureScanOperation } from '../common/queryAndScanCommon'
import { AdvancedScanOnePageOptions } from '../../singleEntityAdvancedOperations'

export async function multipleEntityScan(
  contextsByEntityType: Record<string, EntityContext<unknown, unknown, unknown>>,
  options: AdvancedScanOnePageOptions
): Promise<MultipleEntityCollectionResponse> {
  const defaultEntityContext = Object.values(contextsByEntityType)[0]

  // TODO - need all pages version
  return await performMultipleEntityOperationAndParse(
    contextsByEntityType,
    configureScanOperation(defaultEntityContext, options, false),
    defaultEntityContext
  )
}
