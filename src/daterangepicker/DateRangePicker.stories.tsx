import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type CSSProperties } from 'react';
import { DateRangePicker, getDayOfWeek, type DateRange, type DateRangePickerProps } from './index';

type PickerProps = Omit<DateRangePickerProps, 'children'>;

function Picker({ label = 'Period', ...props }: PickerProps & { label?: string }) {
  return (
    <DateRangePicker {...props}>
      <DateRangePicker.Label>{label}</DateRangePicker.Label>
      <DateRangePicker.Trigger placeholder="Pick a period" />
      <DateRangePicker.Popover>
        <DateRangePicker.Presets aria-label="Presets" />
        <DateRangePicker.PrevMonth />
        <DateRangePicker.NextMonth />
        <DateRangePicker.Months />
      </DateRangePicker.Popover>
    </DateRangePicker>
  );
}

const dateTime = (timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'long', timeZone });

function ValueOutput({ value, timeZone }: { value: DateRange | null; timeZone: string }) {
  if (!value) return <output>No range</output>;
  const format = dateTime(timeZone);
  return (
    <output style={{ whiteSpace: 'pre' }}>
      {`start: ${format.format(value.start)}\n  end: ${format.format(value.end)}\n  ISO: ${value.start.toISOString()} → ${value.end.toISOString()}`}
    </output>
  );
}

const meta = {
  title: 'Components/DateRangePicker',
  tags: ['experimental'],
  parameters: {
    docs: {
      description: {
        component:
          'Pick a range of whole days in a time zone (WAI-ARIA Date Picker Dialog). Arrows move by day and week, PageUp/PageDown by month, Shift+PageUp/PageDown by year, Home/End to the ends of the week. The first Enter or click picks the start, the second the end.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: 480 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => <Picker />,
};

export const Controlled: Story = {
  render: function ControlledStory() {
    const timeZone = 'Europe/Belgrade';
    const [value, setValue] = useState<DateRange | null>(null);
    return (
      <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
        <Picker timeZone={timeZone} value={value} onChange={setValue} />
        <ValueOutput value={value} timeZone={timeZone} />
        <button
          type="button"
          onClick={() => {
            setValue(null);
          }}
        >
          Clear from outside
        </button>
      </div>
    );
  },
};

export const TimeZones: Story = {
  name: 'Edge case: time zone and DST',
  render: function TimeZoneStory() {
    const [timeZone, setTimeZone] = useState('Europe/Belgrade');
    const [value, setValue] = useState<DateRange | null>({
      start: new Date('2026-03-28T23:00:00Z'),
      end: new Date('2026-03-29T21:59:59.999Z'),
    });
    return (
      <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
        <label>
          Time zone{' '}
          <select
            value={timeZone}
            onChange={(event) => {
              setTimeZone(event.target.value);
            }}
          >
            <option>Europe/Belgrade</option>
            <option>America/New_York</option>
            <option>America/Santiago</option>
            <option>Asia/Tokyo</option>
            <option>UTC</option>
          </select>
        </label>
        <Picker timeZone={timeZone} value={value} onChange={setValue} />
        <p style={{ maxWidth: 520, margin: 0 }}>
          March 29, 2026 in Belgrade is 23 hours long. The value is two instants; switching the time zone shows the same
          instants on another calendar.
        </p>
        <ValueOutput value={value} timeZone={timeZone} />
      </div>
    );
  },
};

export const Constraints: Story = {
  name: 'Edge case: min, max, weekends off, max 14 days',
  render: () => {
    const now = Date.now();
    return (
      <Picker
        minDate={new Date(now - 60 * 86_400_000)}
        maxDate={new Date(now)}
        isDateDisabled={(date) => getDayOfWeek(date) === 0 || getDayOfWeek(date) === 6}
        maxDays={14}
      />
    );
  },
};

export const OneMonthLocalized: Story = {
  name: 'Edge case: one month, Serbian locale',
  render: () => (
    <DateRangePicker
      locale="sr-Latn-RS"
      numberOfMonths={1}
      labels={{ previousMonth: 'Prethodni mesec', nextMonth: 'Sledeći mesec' }}
    >
      <DateRangePicker.Label>Period</DateRangePicker.Label>
      <DateRangePicker.Trigger placeholder="Izaberite period" />
      <DateRangePicker.Popover>
        <DateRangePicker.Presets
          aria-label="Brzi izbor"
          custom={<DateRangePicker.CustomPreset>Prilagođeno</DateRangePicker.CustomPreset>}
        >
          {(preset) => (
            <DateRangePicker.Preset preset={preset}>
              {{
                Today: 'Danas',
                'Last 7 days': 'Poslednjih 7 dana',
                'Last 30 days': 'Poslednjih 30 dana',
                'This month': 'Ovaj mesec',
                'Last month': 'Prošli mesec',
              }[preset.label] ?? preset.label}
            </DateRangePicker.Preset>
          )}
        </DateRangePicker.Presets>
        <DateRangePicker.PrevMonth />
        <DateRangePicker.NextMonth />
        <DateRangePicker.Months />
      </DateRangePicker.Popover>
    </DateRangePicker>
  ),
};

export const CustomPresets: Story = {
  name: 'Custom presets',
  render: () => (
    <Picker
      presets={[
        { label: 'Yesterday', range: ({ today, addDays }) => ({ start: addDays(today, -1), end: addDays(today, -1) }) },
        { label: 'Last 90 days', range: ({ today, addDays }) => ({ start: addDays(today, -89), end: today }) },
        {
          label: 'Year to date',
          range: ({ today }) => ({ start: { year: today.year, month: 1, day: 1 }, end: today }),
        },
      ]}
    />
  ),
};

const customTheme = { '--dk-accent': '#be185d', '--dk-radius': '16px' } as CSSProperties;

export const Themed: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The default theme next to a subtree that sets only `--dk-accent` and `--dk-radius`; every color derived from the accent follows. Popups stay at 12px or less whatever the radius is.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      <Picker label="Period (default)" />
      <div style={customTheme}>
        <Picker label="Period (custom)" />
      </div>
    </div>
  ),
};
