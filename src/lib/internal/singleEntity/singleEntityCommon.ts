import { DeleteItemOutput } from '@aws-sdk/client-dynamodb'
import {
  parseConsumedCapacityAndItemCollectionMetrics,
  parseUnparsedReturnedAttributes
} from '../operationsCommon'

export function parseAttributesCapacityAndMetrics(
  result: Pick<DeleteItemOutput, 'Attributes' | 'ConsumedCapacity' | 'ItemCollectionMetrics'>
) {
  return {
    ...parseUnparsedReturnedAttributes(result),
    ...parseConsumedCapacityAndItemCollectionMetrics(result)
  }
}
