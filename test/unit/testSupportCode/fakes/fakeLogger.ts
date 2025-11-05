import {
  EntityStoreLogger,
  EntityStoreLogItemExtraInput,
  EntityStoreLogItemMessage
} from '../../../../src/lib/util/logger.js'

export function fakeLogger(levelName: Uppercase<string>): EntityStoreLogger & {
  debugs: [EntityStoreLogItemMessage, EntityStoreLogItemExtraInput][]
} {
  const debugs: [EntityStoreLogItemMessage, EntityStoreLogItemExtraInput][] = []
  return {
    debugs,
    getLevelName(): Uppercase<string> {
      return levelName
    },
    debug(input: EntityStoreLogItemMessage, ...extraInput) {
      debugs.push([input, extraInput])
    }
  }
}
