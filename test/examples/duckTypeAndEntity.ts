import { typePredicateParser } from '../../src/lib/support/entitySupport'
import { Entity } from '../../src/lib/entities'

export interface Duck {
  breed: string
  name: string
  dateOfBirth: string
  coop: string
}

export function isDuck(x: unknown): x is Duck {
  const candidate = x as Duck
  return (
    candidate.breed !== undefined &&
    candidate.name !== undefined &&
    candidate.dateOfBirth !== undefined &&
    candidate.coop !== undefined
  )
}

export const DUCK_ENTITY: Entity<Duck, Pick<Duck, 'breed'>, Pick<Duck, 'name' | 'dateOfBirth'>> = {
  type: 'duck',
  parse: typePredicateParser(isDuck, 'duck'),
  pk({ breed }: Pick<Duck, 'breed'>): string {
    return `DUCK#BREED#${breed}`
  },
  sk({ name, dateOfBirth }: Pick<Duck, 'name' | 'dateOfBirth'>): string {
    return sk(name, dateOfBirth)
  },
  gsis: {
    gsi: {
      pk({ coop }: Pick<Duck, 'coop'>): string {
        return `COOP#${coop}`
      },
      sk({ breed, dateOfBirth }: Pick<Duck, 'breed' | 'dateOfBirth'>): string {
        return gsiSk(breed, dateOfBirth)
      }
    }
  }
}

function sk(name: string, dateOfBirth: string) {
  return `DATEOFBIRTH#${dateOfBirth}#NAME#${name}`
}

function gsiSk(breed: string, dateOfBirth: string) {
  return `DUCK#BREED#${breed}#DATEOFBIRTH#${dateOfBirth}`
}
