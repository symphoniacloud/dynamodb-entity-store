function filterKeys<T>(object: T, keyPredicate: (x: string) => boolean) {
  return object ? Object.fromEntries(Object.entries(object).filter(([key]) => keyPredicate(key))) : object
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function excludeKeys(object: any, keys: string[]) {
  return filterKeys(object, (key) => !keys.includes(key))
}

export function selectKeys<T>(object: T, keys: string[]) {
  return filterKeys(object, (key) => keys.includes(key))
}

export function chunk<T>(array: T[], size: number) {
  return Array.from({ length: Math.ceil(array.length / size) }, (_v, i) =>
    array.slice(i * size, i * size + size)
  )
}

export function removeNullOrUndefined<T>(array: Array<T | undefined>): Array<T> {
  return array.filter((x) => !(x === undefined || x === null)) as Array<T>
}
