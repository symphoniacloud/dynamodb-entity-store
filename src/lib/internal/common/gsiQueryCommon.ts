import { GsiGenerators } from '../../entities'
import { EntityContext } from '../entityContext'
import { GsiQueryOptions } from '../../operationOptions'
import { throwError } from '../../util/errors'

export interface GsiDetails {
  id: string
  attributeNames: { pk: string; sk?: string }
  tableIndexName: string
  generators: GsiGenerators
}

// TODO - needs more testing
export function findGsiDetails<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  entityContext: EntityContext<TItem, TPKSource, TSKSource>,
  options: GsiQueryOptions
): GsiDetails {
  const entityGsi = findEntityGsi(entityContext, options)
  const tableGsi = findGsiTableDetails(entityContext, entityGsi.gsiId)
  return {
    id: entityGsi.gsiId,
    generators: entityGsi.gsiGenerators,
    attributeNames: tableGsi.attributeNames,
    tableIndexName: tableGsi.indexName
  }
}

function findEntityGsi<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  { entity: { type, gsis } }: EntityContext<TItem, TPKSource, TSKSource>,
  options: GsiQueryOptions
): { gsiId: string; gsiGenerators: GsiGenerators } {
  const entityGsiCount = Object.keys(gsis ?? {}).length
  if (!gsis || entityGsiCount === 0)
    throw new Error(`Entity type ${type} has no GSIs, and therefore cannot be queried by GSI`)
  if (entityGsiCount === 1) {
    const onlyGsi = Object.entries(gsis)[0]
    return {
      gsiId: onlyGsi[0],
      gsiGenerators: onlyGsi[1]
    }
  }
  if (!options.gsiId)
    throw new Error(
      `Entity type ${type} has multiple GSIs but no GSI ID (.gsiId) was specified on query options`
    )
  return {
    gsiId: options.gsiId,
    gsiGenerators: gsis[options.gsiId]
  }
}

function findGsiTableDetails<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  entityContext: EntityContext<TItem, TPKSource, TSKSource>,
  gsiId: string
) {
  const attributeNames =
    entityContext.metaAttributeNames.gsisById[gsiId] ??
    throwError(
      `Table configuration is not correct for GSI ID ${gsiId} - GSI attribute names are not available`
    )()
  const indexName =
    entityContext.tableGsiNames[gsiId] ??
    throwError(`Table configuration is not correct for GSI ID ${gsiId} - no index name is configured`)()

  return {
    attributeNames,
    indexName
  }
}
