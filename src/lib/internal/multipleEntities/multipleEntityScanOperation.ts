import { EntityContext } from '../entityContext'
import { MultipleEntityCollectionResponse } from '../../multipleEntityOperations'
import { QueryAndScanOptions } from '../../operationOptions'
import { performMultipleEntityOperationAndParse } from './multipleEntitiesQueryAndScanCommon'

import { configureScanOperation } from '../common/scanCommon'

export async function multipleEntityScan(
  contextsByEntityType: Record<string, EntityContext<unknown, unknown, unknown>>,
  options: QueryAndScanOptions
): Promise<MultipleEntityCollectionResponse> {
  const defaultEntityContext = Object.values(contextsByEntityType)[0]

  return await performMultipleEntityOperationAndParse(
    contextsByEntityType,
    configureScanOperation(defaultEntityContext, options),
    defaultEntityContext
  )
}
