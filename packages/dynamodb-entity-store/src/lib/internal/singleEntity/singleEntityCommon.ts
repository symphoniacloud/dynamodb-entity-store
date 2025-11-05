import { DeleteItemOutput } from '@aws-sdk/client-dynamodb'
import {
  parseConsumedCapacityAndItemCollectionMetrics,
  parseUnparsedReturnedAttributes
} from '../common/operationsCommon.js'

export function parseAttributesCapacityAndMetrics(
  result: Pick<DeleteItemOutput, 'Attributes' | 'ConsumedCapacity' | 'ItemCollectionMetrics'>
) {
  return {
    ...parseUnparsedReturnedAttributes(result),
    ...parseConsumedCapacityAndItemCollectionMetrics(result)
  }
}
