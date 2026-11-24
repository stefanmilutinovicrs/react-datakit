import { forwardRef, Fragment, type ReactNode } from 'react';
import { Part, useMergedRefs, visuallyHidden, type PartProps } from '../shared';
import { usePicker } from './context';
import type { DateRangePreset } from './presets';

export interface DateRangePickerPopoverState {
  /** A start is picked and the end is not yet. */
  pending: boolean;
}

export type DateRangePickerPopoverProps = PartProps<'div', DateRangePickerPopoverState>;

/** The modal dialog. Rendered only while open; announces the visible months when they change. */
export const Popover = forwardRef<HTMLDivElement, DateRangePickerPopoverProps>(function Popover(
  { children, ...props },
  ref,
) {
  const picker = usePicker('Popover');
  const mergedRef = useMergedRefs<HTMLDivElement>(picker.popoverRef, ref);
  if (!picker.isOpen) return null;
  const ours = {
    ...picker.getPopoverProps(),
    children: (
      <>
        {children}
        <div role="status" aria-live="polite" aria-atomic="true" style={visuallyHidden}>
          {picker.visibleMonthsLabel}
        </div>
      </>
    ),
  };
  return (
    <Part
      tag="div"
      state={{ pending: picker.pendingStart !== null }}
      ours={ours}
      theirs={props}
      forwardedRef={mergedRef}
    />
  );
});

export interface DateRangePickerPresetsState {
  count: number;
  /** The value is set and matches none of the presets. */
  custom: boolean;
}

export type DateRangePickerPresetsProps = Omit<PartProps<'div', DateRangePickerPresetsState>, 'children'> & {
  /** Renders one preset. Default: a `Preset` button with the preset's label. */
  children?: ((preset: DateRangePreset, index: number) => ReactNode) | undefined;
  /** Rendered after the last preset, a `CustomPreset` by default; `null` renders none. */
  custom?: ReactNode;
};

/** A group of preset buttons. Give it an `aria-label`, e.g. "Presets". */
export const Presets = forwardRef<HTMLDivElement, DateRangePickerPresetsProps>(function Presets(
  { children, custom = <CustomPreset />, ...props },
  ref,
) {
  const picker = usePicker('Presets');
  const renderPreset = children ?? ((preset: DateRangePreset) => <Preset preset={preset} />);
  const ours = {
    ...picker.getPresetsProps(),
    children: (
      <>
        {picker.presets.map((preset, index) => (
          <Fragment key={preset.label}>{renderPreset(preset, index)}</Fragment>
        ))}
        {custom}
      </>
    ),
  };
  const state = { count: picker.presets.length, custom: picker.isCustomRange };
  return <Part tag="div" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
});

export interface DateRangePickerPresetState {
  selected: boolean;
  disabled: boolean;
}

export type DateRangePickerPresetProps = PartProps<'button', DateRangePickerPresetState> & {
  preset: DateRangePreset;
};

/** Applies a preset range and closes. Disabled when the preset breaks min, max or `maxDays`. */
export const Preset = forwardRef<HTMLButtonElement, DateRangePickerPresetProps>(function Preset(
  { preset, children, ...props },
  ref,
) {
  const picker = usePicker('Preset');
  const state: DateRangePickerPresetState = {
    selected: picker.isPresetSelected(preset),
    disabled: picker.getPresetRange(preset) === null,
  };
  const ours = { ...picker.getPresetProps(preset), children: children ?? preset.label };
  return <Part tag="button" state={state} ours={ours} theirs={props} forwardedRef={ref} />;
});

export interface DateRangePickerCustomPresetState {
  selected: boolean;
}

export type DateRangePickerCustomPresetProps = PartProps<'button', DateRangePickerCustomPresetState>;

/** Pressed when the value matches no preset; a click keeps the value and moves focus to the calendar. Pass it to `<DateRangePicker.Presets custom={…}>` to change its content. */
export const CustomPreset = forwardRef<HTMLButtonElement, DateRangePickerCustomPresetProps>(function CustomPreset(
  { children, ...props },
  ref,
) {
  const picker = usePicker('CustomPreset');
  const ours = { ...picker.getCustomPresetProps(), children: children ?? 'Custom' };
  return <Part tag="button" state={{ selected: picker.isCustomRange }} ours={ours} theirs={props} forwardedRef={ref} />;
});
