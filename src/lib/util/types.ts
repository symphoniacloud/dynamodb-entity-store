export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>

export type Mandatory<T, K extends keyof T> = Pick<Required<T>, K> & Omit<T, K>
