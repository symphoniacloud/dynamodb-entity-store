import {
  createMinimumSingleTableConfig,
  createStore,
  DynamoDBValues,
  entityFromPkOnlyEntity,
  getPKValue,
  MetaAttributeNames
} from '@symphoniacloud/dynamodb-entity-store'

export interface Farm {
  name: string
  address: string
}

function isFarm(x: unknown): x is Farm {
  const candidate = x as Farm
  return candidate.name !== undefined && candidate.address !== undefined
}

export const FARM_ENTITY = entityFromPkOnlyEntity({
  type: 'farm',
  pk({ name }: Pick<Farm, 'name'>): string {
    return name
  },
  convertToDynamoFormat: (item) => {
    return {
      // 'Name' is automatically added because it is the PK
      FarmAddress: item.address
    }
  },
  parse: (item: DynamoDBValues, _: string[], metaAttributeNames: MetaAttributeNames): Farm => {
    const parsed = {
      // We could just read item.Name here, but this shows that in a custom parser we can
      // access the meta attribute names of table
      name: getPKValue(item, metaAttributeNames),
      address: item.FarmAddress
    }
    if (isFarm(parsed)) return parsed
    else throw new Error('Unable to parse DynamoDB record to Farm')
  }
})

async function run() {
  // Custom configuration - use one table where the partition key attribute name is 'Name', and there is no SK
  // or any other metadata
  const entityStore = createStore({
    ...createMinimumSingleTableConfig('FarmTable', { pk: 'Name' }),
    allowScans: true
  })

  const farmStore = entityStore.for(FARM_ENTITY)
  await farmStore.put({ name: 'Sunflower Farm', address: 'Green Shoots Road, Honesdale, PA' })
  await farmStore.put({ name: 'Worthy Farm', address: 'Glastonbury, England' })

  const worthyFarm = await farmStore.getOrThrow({ name: 'Worthy Farm' })
  console.log(`Address of Worthy Farm: ${worthyFarm.address}`)

  console.log('\nAll farms:')
  for (const farm of await farmStore.scanAll()) {
    console.log(`Name: ${farm.name}, Address: ${farm.address}`)
  }
}

run()
