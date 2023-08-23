import { typePredicateParser } from '../../src/lib/support/entitySupport'
import { Entity } from '../../src/lib/entities'

export interface Dog {
  farm: string
  name: string
  ageInYears: number
}

export function isDog(x: unknown): x is Dog {
  const candidate = x as Dog
  return candidate.farm !== undefined && candidate.name !== undefined && candidate.ageInYears !== undefined
}

export const DOG_ENTITY: Entity<Dog, Pick<Dog, 'farm'>, Pick<Dog, 'name'>> = {
  type: 'dog',
  // TODO - use custom type predicate parser to differentiate dog and cat
  parse: typePredicateParser(isDog, 'dog'),
  pk({ farm }: Pick<Dog, 'farm'>): string {
    return `FARM#${farm}`
  },
  sk({ name }: Pick<Dog, 'name'>): string {
    return sk(name)
  }
}

function sk(name: string) {
  return `DOG#NAME#${name}`
}
