export interface Clock {
  now(): Date
}

export function realClock(): Clock {
  return {
    now(): Date {
      return new Date()
    }
  }
}

export function dateTimeAddMilliseconds(date: Date, millis: number) {
  return new Date(date.valueOf() + millis)
}

export function dateTimeAddSeconds(date: Date, seconds: number) {
  return dateTimeAddMilliseconds(date, seconds * 1000)
}

export function dateTimeAddMinutes(date: Date, minutes: number) {
  return dateTimeAddSeconds(date, minutes * 60)
}

export function dateTimeAddHours(date: Date, hours: number) {
  return dateTimeAddMinutes(date, hours * 60)
}

export function dateTimeAddDays(date: Date, days: number) {
  return dateTimeAddHours(date, days * 24)
}

export function secondsTimestampInFutureDays(clock: Clock, days: number): number {
  return dateToTimestampSeconds(dateTimeAddDays(clock.now(), days))
}

export function dateToTimestampSeconds(date: Date) {
  return Math.floor(date.valueOf() / 1000)
}
