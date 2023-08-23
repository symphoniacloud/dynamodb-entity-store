import { createEntity } from '../../src/lib/support/entitySupport'
import { rangeWhereSkBetween } from '../../src/lib/support/querySupport'

export interface Sheep {
  breed: string
  name: string
  ageInYears: number
}

export function isSheep(x: unknown): x is Sheep {
  const candidate = x as Sheep
  return candidate.breed !== undefined && candidate.name !== undefined && candidate.ageInYears !== undefined
}

export const SHEEP_ENTITY = createEntity(
  'sheep',
  isSheep,
  ({ breed }: Pick<Sheep, 'breed'>) => `SHEEP#BREED#${breed}`,
  ({ name }: Pick<Sheep, 'name'>) => sk(name)
)

function sk(name: string) {
  return `NAME#${name}`
}

export function rangeWhereNameBetween(nameRangeStart: string, nameRangeEnd: string) {
  return rangeWhereSkBetween(sk(nameRangeStart), sk(nameRangeEnd))
}
