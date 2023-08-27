// Also used for generating transaction put items
import { PutCommandInput } from '@aws-sdk/lib-dynamodb'
import { putParams } from '../../common/putCommon'
import { returnParamsForCapacityMetricsAndValues } from '../../operationsCommon'
import { EntityContext } from '../../entityContext'
import { AdvancedPutOptions } from '../../../advanced/advancedOperationOptions'

export function advancedPutParams<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  context: EntityContext<TItem, TPKSource, TSKSource>,
  item: TItem,
  options?: AdvancedPutOptions
): PutCommandInput {
  return {
    ...putParams(context, item, options),
    ...returnParamsForCapacityMetricsAndValues(options)
  }
}
