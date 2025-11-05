export function throwError(message?: string) {
  return () => {
    throw new Error(message)
  }
}
