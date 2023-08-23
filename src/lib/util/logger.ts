/**
 * The table-backed store takes a logger for generating debug log messages, at StoreConfiguration.logger .
 * Since the library doesn't want to make any assumptions about an application's logging design or dependencies it
 * supplies this interface, and two basic implementations that have no library dependencies.
 * In your usage you can either use one of these two basic implementations, or supply your own.
 * For example a Powertools Logging interface might look as follows:
 *
 * function createPowertoolsEntityStoreLogger(logger: Logger): EntityStoreLogger {
 *   return {
 *     getLevelName() {
 *       return logger.getLevelName()
 *     },
 *     debug(input: LogItemMessage, ...extraInput) {
 *       logger.debug(input, ...extraInput)
 *     }
 *   }
 * }
 */
export interface EntityStoreLogger {
  /**
   * Should return 'DEBUG' if debug logging is enabled, otherwise any other uppercase string
   */
  getLevelName(): Uppercase<string>

  /**
   * Log the given content, if debug logging is enabled, otherwise return silently
   * This interface is the same as AWS Powertools logging - see https://docs.powertools.aws.dev/lambda/typescript/latest/api/classes/_aws_lambda_powertools_logger.index.Logger.html#debug
   * @param input
   * @param extraInput
   */
  debug(input: EntityStoreLogItemMessage, ...extraInput: EntityStoreLogItemExtraInput): void
}

// These are copied from AWS Powertools logging, and this logging interface is directly compatible with that library
export type EntityStoreLogItemMessage = string | EntityStoreLogAttributesWithMessage
export type EntityStoreLogAttributesWithMessage = EntityStoreLogAttributes & {
  message: string
}
export type EntityStoreLogAttributes = {
  [key: string]: EntityStoreLogAttributeValue
}
export type EntityStoreLogAttributeValue = unknown
export type EntityStoreLogItemExtraInput = [Error | string] | EntityStoreLogAttributes[]

export function isDebugLoggingEnabled(logger: EntityStoreLogger) {
  return logger.getLevelName() === 'DEBUG'
}

/**
 * Logger where debug logging is disabled, and any calls to debug() are ignored
 */
export const noopLogger: EntityStoreLogger = {
  getLevelName() {
    return 'SILENT'
  },
  debug() {
    return
  }
}

/**
 * Logger where debug logging is enabled, and any calls to debug() are written to the console
 */
export const consoleLogger: EntityStoreLogger = {
  debug(input: EntityStoreLogItemMessage, ...extraInput) {
    console.log(
      `DynamoDB Entity Store DEBUG - ${typeof input === 'string' ? input : JSON.stringify(input)} ${
        extraInput && extraInput.length > 0 ? JSON.stringify(extraInput) : ''
      }`
    )
  },
  getLevelName() {
    return 'DEBUG'
  }
}
