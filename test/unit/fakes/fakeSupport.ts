import deepEqual from 'deep-equal'

export interface StubResponse<TInput, TOutput> {
  addResponse(input: TInput, output: TOutput): void

  getResponse(input: TInput): TOutput | undefined
}

export function arrayStubResponse<TInput, TOutput>(): StubResponse<TInput, TOutput> {
  const stubs: [TInput, TOutput][] = []
  return {
    addResponse(input: TInput, output: TOutput) {
      stubs.push([input, output])
    },
    getResponse(input: TInput): TOutput | undefined {
      return stubs.find(([stubInput]) => deepEqual(input, stubInput))?.[1]
    }
  }
}
