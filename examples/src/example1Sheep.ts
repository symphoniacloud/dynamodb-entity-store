import { createStandardSingleTableStoreConfig } from '@symphoniacloud/dynamodb-entity-store/support/configSupport'
import { createEntity } from '@symphoniacloud/dynamodb-entity-store/support/entitySupport'
import { rangeWhereSkBetween } from '@symphoniacloud/dynamodb-entity-store/support/querySupport'
import { createStore } from '@symphoniacloud/dynamodb-entity-store/tableBackedStore'
// import { consoleLogger } from "@symphoniacloud/dynamodb-entity-store/util/logger"

// Our domain type for Sheep
export interface Sheep {
  breed: string
  name: string
  ageInYears: number
}

// Type predicate for Sheep type
const isSheep = function (x: unknown): x is Sheep {
  const candidate = x as Sheep
  return candidate.breed !== undefined && candidate.name !== undefined && candidate.ageInYears !== undefined
}

// The Entity that defines how to swap between internal domain objects and DynamoDB items
export const SHEEP_ENTITY = createEntity(
  'sheep',
  isSheep,
  ({ breed }: Pick<Sheep, 'breed'>) => `SHEEP#BREED#${breed}`,
  ({ name }: Pick<Sheep, 'name'>) => `NAME#${name}`
)

export function rangeWhereNameBetween(nameRangeStart: string, nameRangeEnd: string) {
  return rangeWhereSkBetween(`NAME#${nameRangeStart}`, `NAME#${nameRangeEnd}`)
}

async function run() {
  // Create entity store using default configuration
  const config = createStandardSingleTableStoreConfig('AnimalsTable')
  // config.store.logger = consoleLogger
  const entityStore = createStore(config)

  await entityStore.for(SHEEP_ENTITY).put({ breed: 'merino', name: 'shaun', ageInYears: 3 })
  await entityStore.for(SHEEP_ENTITY).put({ breed: 'merino', name: 'bob', ageInYears: 4 })
  await entityStore.for(SHEEP_ENTITY).put({ breed: 'suffolk', name: 'alison', ageInYears: 2 })

  const shaun: Sheep = (await entityStore.for(SHEEP_ENTITY).getOrThrow({ breed: 'merino', name: 'shaun' }))
    .item
  console.log(`shaun is ${shaun.ageInYears} years old`)

  console.log('\nAll merinos:')
  const merinos: Sheep[] = (await entityStore.for(SHEEP_ENTITY).query().byPk({ breed: 'merino' })).items
  for (const sheep of merinos) {
    console.log(`${sheep.name} is ${sheep.ageInYears} years old`)
  }

  console.log('\nMerinos with their name starting with the first half of the alphabet:')
  const earlyAlphabetMerinos = (
    await entityStore
      .for(SHEEP_ENTITY)
      .query()
      .byPkAndSk({ breed: 'merino' }, rangeWhereNameBetween('a', 'n'))
  ).items

  for (const sheep of earlyAlphabetMerinos) {
    console.log(sheep.name)
  }
}

run()
