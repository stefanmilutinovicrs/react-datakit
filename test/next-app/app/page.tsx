import { DateRangePicker } from 'react-datakit/daterangepicker';
import { tags, users } from './data';
import { Filters } from './Filters';
import { PeriodParts } from './PeriodParts';

const sprint = { start: new Date('2026-03-10T00:00:00Z'), end: new Date('2026-03-14T23:59:59.999Z') };

// A server component. It renders the DateRangePicker root itself, which only works because
// every entry of the package starts with "use client"; the parts need function props and
// dotted names (DateRangePicker.Trigger), which can't cross the server/client boundary, so
// they come from client files.
export default function Page() {
  return (
    <main data-dk-theme="light">
      <Filters users={users} tags={tags} />
      <DateRangePicker timeZone="UTC">
        <PeriodParts />
      </DateRangePicker>
      {/* Node's ICU puts thin spaces in a formatted range where browsers may not; the server
          HTML must match the client's text when it hydrates. */}
      <DateRangePicker timeZone="UTC" locale="en-US" defaultValue={sprint}>
        <PeriodParts label="Sprint" />
      </DateRangePicker>
    </main>
  );
}
