// INTERIM: stands in for the calendar feature's public service until it exists.
// Returns the synthetic 5 PM demo dinner (docs/demo-scenario.md), labeled as a fixture.
// Delete this file and import the calendar service instead once it is available.

export interface UpcomingEventStart {
  start: Date;
  isFixture: true;
}

export function getUpcomingEventStart(now: Date, timeZone: string): UpcomingEventStart {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now); // YYYY-MM-DD
  const offset = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(now)
    .find((p) => p.type === 'timeZoneName')!
    .value.replace('GMT', '');
  return { start: new Date(`${date}T17:00:00${offset || 'Z'}`), isFixture: true };
}
