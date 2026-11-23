import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import '../styles/theme.css';
import { addDays, endOfDayInZone, startOfDayInZone, toCalendarDate, type CalendarDate } from '../shared/date';
import { expectNoA11yViolations } from '../test/axe';
import { expectNoOptionsOnDom } from '../test/options';
import { dateRangePickerOptionKeys } from './useDateRangePicker';
import { DateRangePicker, type DateRange, type DateRangePickerProps } from './index';

// https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/

const tz = 'Europe/Belgrade';
const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const range = (start: CalendarDate, end: CalendarDate): DateRange => ({
  start: startOfDayInZone(start, tz),
  end: endOfDayInZone(end, tz),
});
const march = range(d(2026, 3, 10), d(2026, 3, 14));

type TestProps = Omit<DateRangePickerProps, 'children'>;

function Picker(props: TestProps) {
  return (
    <DateRangePicker locale="en-US" timeZone={tz} {...props}>
      <DateRangePicker.Label>Period</DateRangePicker.Label>
      <DateRangePicker.Trigger placeholder="Pick dates" />
      <DateRangePicker.Popover>
        <DateRangePicker.Presets aria-label="Presets" />
        <DateRangePicker.PrevMonth>‹</DateRangePicker.PrevMonth>
        <DateRangePicker.NextMonth>›</DateRangePicker.NextMonth>
        <DateRangePicker.Months />
      </DateRangePicker.Popover>
    </DateRangePicker>
  );
}

const trigger = () => page.getByRole('button', { name: 'Period', exact: true });
const dialog = () => page.getByRole('dialog', { name: 'Period' });
const grids = () => page.getByRole('grid');
const day = (label: string) => page.getByRole('gridcell', { name: label, exact: true });
const focusedLabel = () => document.activeElement?.getAttribute('aria-label');

async function openWith(props: TestProps = {}) {
  const screen = await render(<Picker {...props} />);
  await userEvent.click(trigger());
  await expect.element(dialog()).toBeVisible();
  return screen;
}

describe('DateRangePicker', () => {
  it('passes no hook option to the DOM', async () => {
    await expectNoOptionsOnDom(async () => {
      await render(
        <DateRangePicker
          data-testid="root"
          id="period"
          defaultValue={march}
          onChange={() => {}}
          defaultOpen={false}
          onOpenChange={() => {}}
          timeZone={tz}
          locale="en-US"
          weekStartsOn={1}
          numberOfMonths={1}
          minDate={new Date('2026-01-01T00:00:00Z')}
          maxDate={new Date('2026-12-31T00:00:00Z')}
          isDateDisabled={() => false}
          maxDays={31}
          presets={[]}
          closeOnSelect={false}
        >
          <DateRangePicker.Label>Period</DateRangePicker.Label>
          <DateRangePicker.Trigger />
        </DateRangePicker>,
      );
      return page.getByTestId('root').element();
    }, dateRangePickerOptionKeys);
  });

  describe('ARIA', () => {
    it('trigger is a button that controls a modal dialog', async () => {
      await render(<Picker defaultValue={march} />);
      await expect.element(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
      await expect.element(trigger()).toHaveAttribute('aria-expanded', 'false');
      await expect.element(trigger()).toHaveAccessibleName('Period');
      await expect.element(trigger()).toHaveAccessibleDescription(/^Mar 10\s–\s14, 2026$/);

      await userEvent.click(trigger());
      await expect.element(trigger()).toHaveAttribute('aria-expanded', 'true');
      await expect.element(dialog()).toHaveAttribute('aria-modal', 'true');
      await expect.element(trigger()).toHaveAttribute('aria-controls', dialog().element().id);
    });

    it('shows two month grids labelled by their headings, with full date labels on days', async () => {
      await openWith({ defaultValue: march });
      expect(grids().elements()).toHaveLength(2);
      await expect.element(page.getByRole('grid', { name: 'March 2026' })).toBeVisible();
      await expect.element(page.getByRole('grid', { name: 'April 2026' })).toBeVisible();
      await expect
        .element(page.getByRole('grid', { name: 'March 2026' }))
        .toHaveAttribute('aria-multiselectable', 'true');
      await expect.element(day('Tuesday, March 10, 2026')).toHaveAttribute('aria-selected', 'true');
      await expect.element(day('Saturday, March 14, 2026')).toHaveAttribute('aria-selected', 'true');
      await expect.element(day('Sunday, March 15, 2026')).toHaveAttribute('aria-selected', 'false');
    });

    it('exposes parts and range state as data attributes', async () => {
      await openWith({ defaultValue: march });
      await expect.element(trigger()).toHaveAttribute('data-dk-part', 'daterangepicker-trigger');
      await expect.element(dialog()).toHaveAttribute('data-dk-part', 'daterangepicker-popover');
      await expect.element(day('Tuesday, March 10, 2026')).toHaveAttribute('data-dk-part', 'daterangepicker-day');
      await expect.element(day('Tuesday, March 10, 2026')).toHaveAttribute('data-range-start');
      await expect.element(day('Wednesday, March 11, 2026')).toHaveAttribute('data-in-range');
      await expect.element(day('Saturday, March 14, 2026')).toHaveAttribute('data-range-end');
      await expect.element(day('Tuesday, March 10, 2026')).toHaveAttribute('data-date', '2026-03-10');
    });

    it('marks today with aria-current', async () => {
      await openWith();
      const today = toCalendarDate(new Date(), tz);
      const cell = document.querySelector(
        `[data-date="${today.year}-${String(today.month).padStart(2, '0')}-${String(today.day).padStart(2, '0')}"]`,
      );
      expect(cell?.getAttribute('aria-current')).toBe('date');
      expect(cell?.hasAttribute('data-today')).toBe(true);
    });

    it('has no axe violations when closed or open', async () => {
      const screen = await render(<Picker defaultValue={march} />);
      await expectNoA11yViolations(screen.container);
      await userEvent.click(trigger());
      await expect.element(dialog()).toBeVisible();
      await expectNoA11yViolations(screen.container);
    });
  });

  describe('keyboard', () => {
    it('focuses the start of the value when opened', async () => {
      await openWith({ defaultValue: march });
      expect(focusedLabel()).toBe('Tuesday, March 10, 2026');
    });

    it('focuses today when opened without a value', async () => {
      await openWith();
      const today = toCalendarDate(new Date(), tz);
      expect(document.activeElement?.getAttribute('data-date')).toBe(
        `${today.year}-${String(today.month).padStart(2, '0')}-${String(today.day).padStart(2, '0')}`,
      );
    });

    it('moves by day and week with the arrow keys', async () => {
      await openWith({ defaultValue: march });
      await userEvent.keyboard('{ArrowRight}');
      expect(focusedLabel()).toBe('Wednesday, March 11, 2026');
      await userEvent.keyboard('{ArrowDown}');
      expect(focusedLabel()).toBe('Wednesday, March 18, 2026');
      await userEvent.keyboard('{ArrowLeft}');
      expect(focusedLabel()).toBe('Tuesday, March 17, 2026');
      await userEvent.keyboard('{ArrowUp}');
      expect(focusedLabel()).toBe('Tuesday, March 10, 2026');
    });

    it('Home and End move to the first and last day of the week (locale week start)', async () => {
      await openWith({ defaultValue: march });
      await userEvent.keyboard('{Home}');
      expect(focusedLabel()).toBe('Sunday, March 8, 2026');
      await userEvent.keyboard('{End}');
      expect(focusedLabel()).toBe('Saturday, March 14, 2026');
    });

    it('PageUp/PageDown move by month and Shift+PageUp/PageDown by year', async () => {
      await openWith({ defaultValue: range(d(2026, 1, 31), d(2026, 1, 31)) });
      await userEvent.keyboard('{PageDown}');
      expect(focusedLabel()).toBe('Saturday, February 28, 2026');
      await userEvent.keyboard('{PageUp}');
      expect(focusedLabel()).toBe('Wednesday, January 28, 2026');
      await userEvent.keyboard('{Shift>}{PageDown}{/Shift}');
      expect(focusedLabel()).toBe('Thursday, January 28, 2027');
      await expect.element(page.getByRole('grid', { name: 'January 2027' })).toBeVisible();
    });

    it('shifts the visible months when focus leaves them', async () => {
      await openWith({ defaultValue: range(d(2026, 4, 30), d(2026, 4, 30)) });
      await expect.element(page.getByRole('grid', { name: 'April 2026' })).toBeVisible();
      await userEvent.keyboard('{ArrowRight}');
      expect(focusedLabel()).toBe('Friday, May 1, 2026');
      await expect.element(page.getByRole('grid', { name: 'May 2026' })).toBeVisible();
      await expect.element(page.getByRole('grid', { name: 'April 2026' })).toBeVisible();
      await userEvent.keyboard('{PageDown}');
      await expect.element(page.getByRole('grid', { name: 'June 2026' })).toBeVisible();
      await expect.element(page.getByRole('grid', { name: 'April 2026' })).not.toBeInTheDocument();
    });

    it('Enter picks the start, then the end; the value covers whole days in the time zone', async () => {
      const onChange = vi.fn();
      await openWith({ defaultValue: march, onChange });
      await userEvent.keyboard('{Enter}');
      await userEvent.keyboard('{ArrowDown}{ArrowRight}');
      await expect.element(day('Wednesday, March 11, 2026')).toHaveAttribute('data-in-range');
      await userEvent.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledTimes(1);
      const value = onChange.mock.calls[0]?.[0] as DateRange;
      expect(value.start.toISOString()).toBe('2026-03-09T23:00:00.000Z');
      expect(value.end.toISOString()).toBe('2026-03-18T22:59:59.999Z');

      await expect.element(dialog()).not.toBeInTheDocument();
      await expect.element(trigger()).toHaveFocus();
      await expect.element(trigger()).toHaveTextContent('Mar 10 – 18, 2026');
    });

    it('Space selects too, and a range picked backwards is ordered', async () => {
      const onChange = vi.fn();
      await openWith({ defaultValue: march, onChange });
      await userEvent.keyboard(' ');
      await userEvent.keyboard('{ArrowLeft}{ArrowLeft} ');
      const value = onChange.mock.calls[0]?.[0] as DateRange;
      expect(toCalendarDate(value.start, tz)).toEqual(d(2026, 3, 8));
      expect(toCalendarDate(value.end, tz)).toEqual(d(2026, 3, 10));
    });

    it('Escape closes the dialog without changing the value and returns focus', async () => {
      const onChange = vi.fn();
      await openWith({ defaultValue: march, onChange });
      await userEvent.keyboard('{Enter}{ArrowRight}{Escape}');
      await expect.element(dialog()).not.toBeInTheDocument();
      await expect.element(trigger()).toHaveFocus();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('Tab stays inside the dialog', async () => {
      await openWith({ defaultValue: march });
      const dialogElement = dialog().element();
      for (let i = 0; i < 12; i++) {
        await userEvent.keyboard('{Tab}');
        expect(dialogElement.contains(document.activeElement)).toBe(true);
      }
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
      expect(dialogElement.contains(document.activeElement)).toBe(true);
    });

    it('only the focused day is in the tab order', async () => {
      await openWith({ defaultValue: march });
      const tabbable = page
        .getByRole('gridcell')
        .elements()
        .filter((el) => el.getAttribute('tabindex') === '0');
      expect(tabbable).toHaveLength(1);
      expect(tabbable[0]?.getAttribute('aria-label')).toBe('Tuesday, March 10, 2026');
    });
  });

  describe('pointer', () => {
    it('click picks the start, hover previews the range, a second click commits', async () => {
      const onChange = vi.fn();
      await openWith({ defaultValue: march, onChange });
      await userEvent.click(day('Monday, March 2, 2026'));
      await userEvent.hover(day('Thursday, March 5, 2026'));
      await expect.element(day('Wednesday, March 4, 2026')).toHaveAttribute('data-in-range');
      await expect.element(day('Friday, March 6, 2026')).not.toHaveAttribute('data-in-range');
      expect(onChange).not.toHaveBeenCalled();

      await userEvent.click(day('Thursday, March 5, 2026'));
      const value = onChange.mock.calls[0]?.[0] as DateRange;
      expect(toCalendarDate(value.start, tz)).toEqual(d(2026, 3, 2));
      expect(toCalendarDate(value.end, tz)).toEqual(d(2026, 3, 5));
    });

    it('the month buttons change the visible months', async () => {
      await openWith({ defaultValue: march });
      await userEvent.click(page.getByRole('button', { name: 'Next month' }));
      await expect.element(page.getByRole('grid', { name: 'April 2026' })).toBeVisible();
      await expect.element(page.getByRole('grid', { name: 'May 2026' })).toBeVisible();
      await userEvent.click(page.getByRole('button', { name: 'Previous month' }));
      await userEvent.click(page.getByRole('button', { name: 'Previous month' }));
      await expect.element(page.getByRole('grid', { name: 'February 2026' })).toBeVisible();
    });

    it('announces the visible months when they change', async () => {
      await openWith({ defaultValue: march });
      await userEvent.click(page.getByRole('button', { name: 'Next month' }));
      await expect.element(page.getByRole('status')).toHaveTextContent('April 2026 – May 2026');
    });

    it('a click outside closes the dialog', async () => {
      await render(
        <>
          <Picker defaultValue={march} />
          <button type="button">Outside</button>
        </>,
      );
      await userEvent.click(trigger());
      await expect.element(dialog()).toBeVisible();
      await userEvent.click(page.getByRole('button', { name: 'Outside' }));
      await expect.element(dialog()).not.toBeInTheDocument();
    });
  });

  describe('time zones', () => {
    it('a single day on the DST change covers 23 hours', async () => {
      const onChange = vi.fn();
      await openWith({ defaultValue: range(d(2026, 3, 29), d(2026, 3, 29)), onChange });
      await userEvent.keyboard('{Enter}{Enter}');
      const value = onChange.mock.calls[0]?.[0] as DateRange;
      expect(value.start.toISOString()).toBe('2026-03-28T23:00:00.000Z');
      expect(value.end.toISOString()).toBe('2026-03-29T21:59:59.999Z');
    });

    it('shows the value in the calendar of the given time zone', async () => {
      // 2026-03-10T23:30Z is still March 10 in New York, but March 11 in Belgrade.
      const value = { start: new Date('2026-03-10T23:30:00Z'), end: new Date('2026-03-12T23:30:00Z') };
      await render(<Picker value={value} timeZone="America/New_York" />);
      await expect.element(trigger()).toHaveTextContent('Mar 10 – 12, 2026');
    });
  });

  describe('constraints', () => {
    it('minDate and maxDate disable days outside them and keep focus inside', async () => {
      const onChange = vi.fn();
      await openWith({
        defaultValue: march,
        minDate: startOfDayInZone(d(2026, 3, 9), tz),
        maxDate: startOfDayInZone(d(2026, 3, 20), tz),
        onChange,
      });
      await expect.element(day('Sunday, March 8, 2026')).toHaveAttribute('aria-disabled', 'true');
      await expect.element(day('Saturday, March 21, 2026')).toHaveAttribute('data-disabled');
      await userEvent.keyboard('{ArrowUp}');
      expect(focusedLabel()).toBe('Monday, March 9, 2026');
      await userEvent.keyboard('{PageDown}');
      expect(focusedLabel()).toBe('Friday, March 20, 2026');

      // A disabled day ignores clicks (force: Playwright refuses to click aria-disabled elements).
      await userEvent.click(day('Sunday, March 8, 2026'), { force: true });
      await userEvent.click(day('Monday, March 9, 2026'));
      await userEvent.click(day('Tuesday, March 10, 2026'));
      expect(toCalendarDate((onChange.mock.calls[0]?.[0] as DateRange).start, tz)).toEqual(d(2026, 3, 9));
    });

    it('isDateDisabled disables single days', async () => {
      const onChange = vi.fn();
      await openWith({ defaultValue: march, isDateDisabled: (date) => date.day === 12, onChange });
      await expect.element(day('Thursday, March 12, 2026')).toHaveAttribute('aria-disabled', 'true');
      await userEvent.keyboard('{ArrowRight}{ArrowRight}{Enter}');
      expect(focusedLabel()).toBe('Thursday, March 12, 2026');
      await userEvent.keyboard('{Enter}');
      expect(onChange).not.toHaveBeenCalled();
      await expect.element(dialog()).toBeVisible();
    });

    it('maxDays limits the length of the range once a start is picked', async () => {
      await openWith({ defaultValue: march, maxDays: 7 });
      await userEvent.keyboard('{Enter}');
      await expect.element(day('Monday, March 16, 2026')).not.toHaveAttribute('data-disabled');
      await expect.element(day('Tuesday, March 17, 2026')).toHaveAttribute('aria-disabled', 'true');
      await expect.element(day('Wednesday, March 4, 2026')).not.toHaveAttribute('data-disabled');
      await expect.element(day('Tuesday, March 3, 2026')).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('presets', () => {
    it('applies a preset relative to today in the time zone and closes', async () => {
      const onChange = vi.fn();
      await openWith({ onChange });
      await userEvent.click(page.getByRole('button', { name: 'Last 7 days' }));
      const today = toCalendarDate(new Date(), tz);
      const value = onChange.mock.calls[0]?.[0] as DateRange;
      expect(toCalendarDate(value.start, tz)).toEqual(addDays(today, -6));
      expect(toCalendarDate(value.end, tz)).toEqual(today);
      await expect.element(dialog()).not.toBeInTheDocument();
    });

    it('marks the preset that matches the value', async () => {
      const today = toCalendarDate(new Date(), tz);
      await openWith({ defaultValue: range(today, today) });
      await expect.element(page.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'true');
      await expect.element(page.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('takes a custom list of presets', async () => {
      const onChange = vi.fn();
      await openWith({
        onChange,
        presets: [{ label: 'Next 3 days', range: ({ today, addDays }) => ({ start: today, end: addDays(today, 2) }) }],
      });
      expect(page.getByRole('group', { name: 'Presets' }).getByRole('button').elements()).toHaveLength(1);
      await userEvent.click(page.getByRole('button', { name: 'Next 3 days' }));
      const today = toCalendarDate(new Date(), tz);
      expect(toCalendarDate((onChange.mock.calls[0]?.[0] as DateRange).end, tz)).toEqual(addDays(today, 2));
    });

    it('disables a preset that breaks the constraints', async () => {
      await openWith({ maxDays: 5 });
      await expect.element(page.getByRole('button', { name: 'Last 7 days' })).toBeDisabled();
      await expect.element(page.getByRole('button', { name: 'Today' })).toBeEnabled();
    });
  });

  describe('state', () => {
    it('works controlled', async () => {
      function Controlled() {
        const [value, setValue] = useState<DateRange | null>(march);
        return (
          <>
            <Picker value={value} onChange={setValue} />
            <output>{value ? toCalendarDate(value.end, tz).day : 'none'}</output>
            <button type="button" onClick={() => setValue(null)}>
              Reset
            </button>
          </>
        );
      }
      await render(<Controlled />);
      await userEvent.click(trigger());
      await userEvent.keyboard('{Enter}{ArrowRight}{Enter}');
      await expect.element(page.getByRole('status').filter({ hasText: /^\d+$/ })).toHaveTextContent('11');
      await userEvent.click(page.getByRole('button', { name: 'Reset' }));
      await expect.element(trigger()).toHaveTextContent('Pick dates');
    });

    it('open state can be controlled', async () => {
      const onOpenChange = vi.fn();
      const screen = await render(<Picker open={false} onOpenChange={onOpenChange} />);
      await userEvent.click(trigger());
      expect(onOpenChange).toHaveBeenCalledWith(true);
      await expect.element(dialog()).not.toBeInTheDocument();
      await screen.rerender(<Picker open onOpenChange={onOpenChange} />);
      await expect.element(dialog()).toBeVisible();
    });

    it('shows one month with numberOfMonths={1}', async () => {
      await openWith({ defaultValue: march, numberOfMonths: 1 });
      expect(grids().elements()).toHaveLength(1);
    });

    it('starts the week on the locale first day, or on weekStartsOn', async () => {
      const screen = await render(<Picker defaultValue={march} locale="sr-Latn-RS" />);
      await userEvent.click(trigger());
      const header = () => page.getByRole('columnheader').first().element().getAttribute('aria-label');
      expect(header()).toBe('ponedeljak');
      await screen.rerender(<Picker defaultValue={march} weekStartsOn={3} />);
      expect(header()).toBe('Wednesday');
    });
  });

  describe('parts', () => {
    it('accept className as a function of state, render and ref', async () => {
      const ref = { current: null as HTMLButtonElement | null };
      await render(
        <DateRangePicker locale="en-US" timeZone={tz} defaultValue={march}>
          <DateRangePicker.Label>Period</DateRangePicker.Label>
          <DateRangePicker.Trigger ref={ref} className={({ open }) => (open ? 'is-open' : 'is-closed')}>
            {({ formattedValue }) => `Range: ${formattedValue ?? '—'}`}
          </DateRangePicker.Trigger>
          <DateRangePicker.Popover>
            <DateRangePicker.Months>
              {(month) => (
                <DateRangePicker.Month month={month}>
                  <DateRangePicker.MonthHeading render={(props) => <h3 {...props} />} />
                  <DateRangePicker.Grid>
                    {(date) => (
                      <DateRangePicker.Day date={date} className={(s) => (s.rangeStart ? 'start' : undefined)}>
                        {(s) => (s.selected ? `[${date.day}]` : date.day)}
                      </DateRangePicker.Day>
                    )}
                  </DateRangePicker.Grid>
                </DateRangePicker.Month>
              )}
            </DateRangePicker.Months>
          </DateRangePicker.Popover>
        </DateRangePicker>,
      );
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      await expect.element(trigger()).toHaveClass('is-closed');
      await expect.element(trigger()).toHaveTextContent('Range: Mar 10 – 14, 2026');
      await userEvent.click(trigger());
      await expect.element(trigger()).toHaveClass('is-open');
      await expect.element(page.getByRole('heading', { level: 3, name: 'March 2026' })).toBeVisible();
      await expect.element(day('Tuesday, March 10, 2026')).toHaveClass('start');
      await expect.element(day('Tuesday, March 10, 2026')).toHaveTextContent('[10]');
    });
  });
});
