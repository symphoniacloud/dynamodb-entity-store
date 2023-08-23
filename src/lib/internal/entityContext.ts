import { Entity, MetaAttributeNames } from '../entities'
import { DynamoDBInterface } from '../dynamoDBInterface'
import { Clock } from '../util/dateAndTime'
import { Mandatory } from '../util/types'
import { StoreConfiguration, Table } from '../tableBackedStoreConfiguration'
import { EntityStoreLogger } from '../util/logger'

export type ContextMetaAttributeNames = Mandatory<MetaAttributeNames, 'gsisById'>

export interface EntityContext<TItem extends TPKSource & TSKSource, TPKSource, TSKSource> {
  dynamoDB: DynamoDBInterface
  clock: Clock
  logger: EntityStoreLogger
  entity: Entity<TItem, TPKSource, TSKSource>
  tableName: string
  tableGsiNames: Record<string, string>
  metaAttributeNames: ContextMetaAttributeNames
  allMetaAttributeNames: string[]
}

export type CompleteTableParams = Mandatory<Table, 'allowScans' | 'dynamoDB'> &
  Required<Pick<StoreConfiguration, 'clock' | 'logger'>>

export function createEntityContext<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  table: CompleteTableParams,
  entity: Entity<TItem, TPKSource, TSKSource>
): EntityContext<TItem, TPKSource, TSKSource> {
  const metaAttributeNames = {
    ...table.metaAttributeNames,
    gsisById: table.metaAttributeNames.gsisById ?? {}
  }
  return {
    dynamoDB: table.dynamoDB,
    clock: table.clock,
    logger: table.logger,
    entity,
    tableName: table.tableName,
    tableGsiNames: table.gsiNames ?? {},
    metaAttributeNames,
    allMetaAttributeNames: calcAllMetaAttributeNames(metaAttributeNames)
  }
}

export function calcAllMetaAttributeNames({ gsisById, ...basicAttributes }: MetaAttributeNames): string[] {
  return [
    ...Object.values(basicAttributes),
    ...Object.values(gsisById ?? {})
      .map(({ pk, sk }) => [pk, sk ?? []].flat())
      .flat()
  ]
}
