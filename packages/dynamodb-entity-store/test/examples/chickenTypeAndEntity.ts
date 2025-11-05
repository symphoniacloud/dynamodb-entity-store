import { typePredicateParser } from '../../src/lib/support/entitySupport.js'
import {
  rangeWhereSkBeginsWith,
  rangeWhereSkGreaterThan,
  rangeWhereSkLessThan
} from '../../src/lib/support/querySupport.js'
import { Entity } from '../../src/lib/entities.js'

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
        return gsiSk(breed, dateOfBirth)
      }
    }
  }
}

export const TWO_GSI_CHICKEN_ENTITY: Entity<
  Chicken,
  Pick<Chicken, 'breed'>,
  Pick<Chicken, 'name' | 'dateOfBirth'>
> = {
  ...CHICKEN_ENTITY,
  gsis: {
    gsi1: {
      pk({ coop }: Pick<Chicken, 'coop'>): string {
        return `COOP#${coop}`
      },
      sk({ breed, dateOfBirth }: Pick<Chicken, 'breed' | 'dateOfBirth'>): string {
        return gsiSk(breed, dateOfBirth)
      }
    },
    gsi2: {
      pk(): string {
        return `CHICKEN`
      },
      sk({ dateOfBirth }: Pick<Chicken, 'dateOfBirth'>): string {
        return `DATEOFBIRTH#${dateOfBirth}`
      }
    }
  }
}

function sk(name: string, dateOfBirth: string) {
  return `DATEOFBIRTH#${dateOfBirth}#NAME#${name}`
}

function gsiSk(breed: string, dateOfBirth: string) {
  return `CHICKEN#BREED#${breed}#DATEOFBIRTH#${dateOfBirth}`
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
