import { Chicken } from './chickenTypeAndEntity'
import { Duck } from './duckTypeAndEntity'
import { Sheep } from './sheepTypeAndEntity'
import { Dog } from './dogTypeAndEntity'
import { Cat } from './catTypeAndEntity'

export const shaunIdentifier = { breed: 'merino', name: 'shaun' }
export const shaunTheSheep: Sheep = { ...shaunIdentifier, ageInYears: 3 }
export const bobIdentifier = { breed: 'merino', name: 'bob' }
export const bobTheSheep: Sheep = { ...bobIdentifier, ageInYears: 4 }
export const alisonIdentifier = { breed: 'alpaca', name: 'alison' }
export const alisonTheAlpaca: Sheep = { ...alisonIdentifier, ageInYears: 2 }

export const chesterDog: Dog = { farm: 'Sunflower Farm', name: 'Chester', ageInYears: 4 }
export const peggyCat: Cat = { farm: 'Sunflower Farm', name: 'Peggy', ageInYears: 7 }

export const gingerIdentifier = {
  breed: 'sussex',
  name: 'ginger',
  dateOfBirth: '2021-07-01'
}
export const ginger: Chicken = {
  ...gingerIdentifier,
  coop: 'bristol'
}
export const babs: Chicken = {
  breed: 'sussex',
  name: 'babs',
  dateOfBirth: '2021-09-01',
  coop: 'bristol'
}
export const bunty: Chicken = {
  breed: 'sussex',
  name: 'bunty',
  dateOfBirth: '2021-11-01',
  coop: 'bristol'
}
export const yolko: Chicken = {
  breed: 'sussex',
  name: 'yolko',
  dateOfBirth: '2020-12-01',
  coop: 'dakota'
}
export const cluck: Chicken = {
  breed: 'orpington',
  name: 'cluck',
  dateOfBirth: '2022-03-01',
  coop: 'dakota'
}

export const waddles: Duck = {
  breed: 'mallard',
  name: 'waddles',
  dateOfBirth: '2021-04-01',
  coop: 'bristol'
}
