import { EntityContext } from '../entityContext'
import { MultipleEntityCollectionResponse, QueryAndScanOptions } from '../../multipleEntityOperations'
import { performMultipleEntityOperationAndParse } from './multipleEntitiesQueryAndScanCommon'

import { configureScanOperation } from '../common/queryAndScanCommon'

export async function multipleEntityScan(
  contextsByEntityType: Record<string, EntityContext<unknown, unknown, unknown>>,
  options: QueryAndScanOptions
): Promise<MultipleEntityCollectionResponse> {
  const defaultEntityContext = Object.values(contextsByEntityType)[0]

  // TODO - need all pages version
  return await performMultipleEntityOperationAndParse(
    contextsByEntityType,
    configureScanOperation(defaultEntityContext, options, false),
    defaultEntityContext
  )
}
