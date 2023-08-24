import {
  createStandardSingleTableStoreConfig,
  createStore,
  Entity,
  rangeWhereSkBeginsWith,
  rangeWhereSkGreaterThan,
  rangeWhereSkLessThan,
  typePredicateParser
} from '@symphoniacloud/dynamodb-entity-store'

export interface Chicken {
  breed: string
  name: string
  dateOfBirth: string
  coop: string
}

export function isChicken(x: unknown): x is Chicken {
  const candidate = x as Chicken
  return (
    candidate.breed !== undefined &&
    candidate.name !== undefined &&
    candidate.dateOfBirth !== undefined &&
    candidate.coop !== undefined
  )
}

export const CHICKEN_ENTITY: Entity<
  Chicken,
  Pick<Chicken, 'breed'>,
  Pick<Chicken, 'name' | 'dateOfBirth'>
> = {
  type: 'chicken',
  parse: typePredicateParser(isChicken, 'chicken'),
  pk({ breed }: Pick<Chicken, 'breed'>): string {
    return `CHICKEN#BREED#${breed}`
  },
  sk({ name, dateOfBirth }: Pick<Chicken, 'name' | 'dateOfBirth'>): string {
    return sk(name, dateOfBirth)
  },
  gsis: {
    gsi: {
      pk({ coop }: Pick<Chicken, 'coop'>): string {
        return `COOP#${coop}`
      },
      sk({ breed, dateOfBirth }: Pick<Chicken, 'breed' | 'dateOfBirth'>): string {
        return `CHICKEN#BREED#${breed}#DATEOFBIRTH#${dateOfBirth}`
      }
    }
  }
}

function sk(name: string, dateOfBirth: string) {
  return `DATEOFBIRTH#${dateOfBirth}#NAME#${name}`
}

export function findOlderThan(dateOfBirthStart: string) {
  return rangeWhereSkLessThan(`DATEOFBIRTH#${dateOfBirthStart}`)
}

export function findYoungerThan(dateOfBirthStart: string) {
  return rangeWhereSkGreaterThan(`DATEOFBIRTH#${dateOfBirthStart}`)
}

export function gsiBreed(breed: string) {
  return rangeWhereSkBeginsWith(`CHICKEN#BREED#${breed}`)
}

async function run() {
  // Create entity store using default configuration
  const entityStore = createStore(createStandardSingleTableStoreConfig('AnimalsTable'))
  const chickenStore = entityStore.for(CHICKEN_ENTITY)

  await chickenStore.put({ breed: 'sussex', name: 'ginger', dateOfBirth: '2021-07-01', coop: 'bristol' })
  await chickenStore.put({ breed: 'sussex', name: 'babs', dateOfBirth: '2021-09-01', coop: 'bristol' })
  await chickenStore.put({ breed: 'sussex', name: 'bunty', dateOfBirth: '2021-01-01', coop: 'bristol' })
  await chickenStore.put({ breed: 'sussex', name: 'yolko', dateOfBirth: '2020-12-01', coop: 'dakota' })
  await chickenStore.put({ breed: 'orpington', name: 'cluck', dateOfBirth: '2022-03-01', coop: 'dakota' })

  console.log('Chickens in Dakota:')
  for (const chicken of (await chickenStore.queryWithGsi().byPk({ coop: 'dakota' })).items) {
    console.log(chicken.name)
  }

  console.log('\nOrpingtons in Dakota:')
  for (const chicken of (
    await chickenStore
      .queryWithGsi()
      .byPkAndSk({ coop: 'dakota' }, rangeWhereSkBeginsWith('CHICKEN#BREED#orpington'))
  ).items) {
    console.log(chicken.name)
  }
}

run()
