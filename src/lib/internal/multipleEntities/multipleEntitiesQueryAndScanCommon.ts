import { EntityContext } from '../entityContext'
import { MultipleEntityCollectionResponse } from '../../multipleEntityOperations'
import { parseItem } from '../common/operationsCommon'
import {
  commonCollectionResponseElements,
  executeQueryOrScan,
  QueryScanOperationConfiguration,
  UnparsedCollectionResult
} from '../common/queryAndScanCommon'
import {
  QueryCommandInput,
  QueryCommandOutput,
  ScanCommandInput,
  ScanCommandOutput
} from '@aws-sdk/lib-dynamodb'

export async function performMultipleEntityOperationAndParse<
  TCommandInput extends ScanCommandInput & QueryCommandInput,
  TCommandOutput extends ScanCommandOutput & QueryCommandOutput
>(
  contextsByEntityType: Record<string, EntityContext<unknown, unknown, unknown>>,
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
  contextsByEntityType: Record<string, EntityContext<unknown, unknown, unknown>>,
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
