import { Entity, MetaAttributeNames } from '../entities.js'
import { Mandatory } from '../util/types.js'
import { StoreContext, TableConfig } from '../tableBackedStoreConfiguration.js'

export type ContextMetaAttributeNames = Mandatory<MetaAttributeNames, 'gsisById'>

export interface EntityContext<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>
  extends StoreContext,
    Pick<TableConfig, 'tableName' | 'allowScans'> {
  entity: Entity<TItem, TPKSource, TSKSource>
  tableGsiNames: Record<string, string>
  metaAttributeNames: ContextMetaAttributeNames
  allMetaAttributeNames: string[]
}

export interface EntityContextParams {
  table: TableConfig
  storeContext: StoreContext
}

export function createEntityContext<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  { storeContext, table }: EntityContextParams,
  entity: Entity<TItem, TPKSource, TSKSource>
): EntityContext<TItem, TPKSource, TSKSource> {
  const metaAttributeNames = {
    ...table.metaAttributeNames,
    gsisById: table.metaAttributeNames.gsisById ?? {}
  }
  return {
    ...storeContext,
    tableName: table.tableName,
    tableGsiNames: table.gsiNames ?? {},
    ...(table.allowScans !== undefined ? { allowScans: table.allowScans } : {}),
    entity,
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
