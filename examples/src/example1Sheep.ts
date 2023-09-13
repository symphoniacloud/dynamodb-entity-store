import {
  createEntity,
  createStandardSingleTableStoreConfig,
  createStore,
  DynamoDBValues,
  rangeWhereSkBetween
} from '@symphoniacloud/dynamodb-entity-store'

// Our domain type for Sheep
export interface Sheep {
  breed: string
  name: string
  ageInYears: number
}

// Type predicate for Sheep type
const isSheep = function (x: DynamoDBValues): x is Sheep {
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

async function run() {
  // Create entity store using default configuration
  const config = createStandardSingleTableStoreConfig('AnimalsTable')
  // config.store.logger = consoleLogger
  const entityStore = createStore(config)

  const sheepOperations = entityStore.for(SHEEP_ENTITY)
  await sheepOperations.put({ breed: 'merino', name: 'shaun', ageInYears: 3 })
  await sheepOperations.put({ breed: 'merino', name: 'bob', ageInYears: 4 })
  await sheepOperations.put({ breed: 'suffolk', name: 'alison', ageInYears: 2 })

  const shaun: Sheep = await sheepOperations.getOrThrow({ breed: 'merino', name: 'shaun' })
  console.log(`shaun is ${shaun.ageInYears} years old`)

  console.log('\nAll merinos:')
  const merinos: Sheep[] = await sheepOperations.queryAllByPk({ breed: 'merino' })
  for (const sheep of merinos) {
    console.log(`${sheep.name} is ${sheep.ageInYears} years old`)
  }

  function rangeWhereNameBetween(nameRangeStart: string, nameRangeEnd: string) {
    return rangeWhereSkBetween(`NAME#${nameRangeStart}`, `NAME#${nameRangeEnd}`)
  }

  console.log('\nMerinos with their name starting with the first half of the alphabet:')
  const earlyAlphabetMerinos = await sheepOperations.queryAllByPkAndSk(
    { breed: 'merino' },
    rangeWhereNameBetween('a', 'n')
  )

  for (const sheep of earlyAlphabetMerinos) {
    console.log(sheep.name)
  }
}

run()
