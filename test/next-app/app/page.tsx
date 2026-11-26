import { DateRangePicker } from 'react-datakit/daterangepicker';
import { tags, users } from './data';
import { Filters } from './Filters';
import { PeriodParts } from './PeriodParts';

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
    </main>
  );
}
