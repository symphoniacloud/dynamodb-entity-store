import { EntityContext } from '../entityContext.js'
import { MultipleEntityCollectionResponse } from '../../multipleEntityOperations.js'
import { parseItem } from '../common/operationsCommon.js'
import {
  commonCollectionResponseElements,
  executeQueryOrScan,
  QueryScanOperationConfiguration,
  UnparsedCollectionResult
} from '../common/queryAndScanCommon.js'
import {
  QueryCommandInput,
  QueryCommandOutput,
  ScanCommandInput,
  ScanCommandOutput
} from '@aws-sdk/lib-dynamodb'

// Not defined in the type, but a guarantee from tableBackedMultipleEntityOperations
// is that this only contains contexts for one table
// Therefore any entry contains the same table details
export type EntityContextsByEntityType = Record<string, EntityContext<unknown, unknown, unknown>>

export async function performMultipleEntityOperationAndParse<
  TCommandInput extends ScanCommandInput & QueryCommandInput,
  TCommandOutput extends ScanCommandOutput & QueryCommandOutput
>(
  contextsByEntityType: EntityContextsByEntityType,
  operationConfiguration: QueryScanOperationConfiguration<TCommandInput, TCommandOutput>,
  defaultEntityContext: EntityContext<unknown, unknown, unknown>
) {
  const {
    logger,
    metaAttributeNames: { entityType: entityTypeAttributeName }
  } = defaultEntityContext

  if (!entityTypeAttributeName)
    throw new Error(
      `Unable to operate on multiple entities - no entityType attribute is configured for table`
    )

  return parseMultipleEntityResults(
    entityTypeAttributeName,
    contextsByEntityType,
    await executeQueryOrScan(operationConfiguration, logger)
  )
}

export function parseMultipleEntityResults(
  entityTypeAttributeName: string,
  contextsByEntityType: EntityContextsByEntityType,
  unparsedResult: UnparsedCollectionResult
): MultipleEntityCollectionResponse {
  const { itemsByEntityType, unparsedItems } = unparsedResult.items.reduce(
    (accum, item) => {
      const et = item[entityTypeAttributeName]
      const context = contextsByEntityType[et]
      if (context) {
        if (!accum.itemsByEntityType[et]) accum.itemsByEntityType[et] = []
        accum.itemsByEntityType[et].push(parseItem(context, item))
      } else accum.unparsedItems.push(item)
      return accum
    },
    {
      itemsByEntityType: {},
      unparsedItems: []
    }
  )

  return {
    itemsByEntityType,
    ...commonCollectionResponseElements(unparsedItems, unparsedResult)
  }
}
