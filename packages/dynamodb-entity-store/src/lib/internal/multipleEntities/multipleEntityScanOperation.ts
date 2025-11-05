import { MultipleEntityCollectionResponse } from '../../multipleEntityOperations.js'
import {
  EntityContextsByEntityType,
  performMultipleEntityOperationAndParse
} from './multipleEntitiesQueryAndScanCommon.js'

import { configureScanOperation } from '../common/queryAndScanCommon.js'
import { AdvancedScanOnePageOptions } from '../../singleEntityAdvancedOperations.js'

export async function scanMultiple(
  contextsByEntityType: EntityContextsByEntityType,
  allPages: boolean,
  options: AdvancedScanOnePageOptions = {}
): Promise<MultipleEntityCollectionResponse> {
  const defaultEntityContext = Object.values(contextsByEntityType)[0]

  if (defaultEntityContext.allowScans === undefined || !defaultEntityContext.allowScans) {
    throw new Error('Scan operations are disabled for this store')
  }

  return await performMultipleEntityOperationAndParse(
    contextsByEntityType,
    configureScanOperation(defaultEntityContext, options, allPages),
    defaultEntityContext
  )
}
