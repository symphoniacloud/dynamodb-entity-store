import { Clock } from '../../../src/lib/util/dateAndTime'

export class FakeClock implements Clock {
  public fakeNowIso: string

  constructor(fakeNowIso = '2023-07-01T19:00:00.000Z') {
    this.fakeNowIso = fakeNowIso
  }

  now(): Date {
    return new Date(Date.parse(this.fakeNowIso))
  }
}
