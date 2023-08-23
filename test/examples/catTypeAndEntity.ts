import { typePredicateParser } from '../../src/lib/support/entitySupport'
import { Entity } from '../../src/lib/entities'

export interface Cat {
  farm: string
  name: string
  ageInYears: number
}

export function isCat(x: unknown): x is Cat {
  const candidate = x as Cat
  return candidate.farm !== undefined && candidate.name !== undefined && candidate.ageInYears !== undefined
}

export const CAT_ENTITY: Entity<Cat, Pick<Cat, 'farm'>, Pick<Cat, 'name'>> = {
  type: 'cat',
  // TODO - use custom type predicate parser to differentiate dog and cat
  parse: typePredicateParser(isCat, 'cat'),
  pk({ farm }: Pick<Cat, 'farm'>): string {
    return `FARM#${farm}`
  },
  sk({ name }: Pick<Cat, 'name'>): string {
    return sk(name)
  }
}

function sk(name: string) {
  return `CAT#NAME#${name}`
}
