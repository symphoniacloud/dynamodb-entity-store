import { MultipleEntityCollectionResponse } from '../../multipleEntityOperations'
import {
  EntityContextsByEntityType,
  performMultipleEntityOperationAndParse
} from './multipleEntitiesQueryAndScanCommon'

import { configureScanOperation } from '../common/queryAndScanCommon'
import { AdvancedScanOnePageOptions } from '../../singleEntityAdvancedOperations'

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
