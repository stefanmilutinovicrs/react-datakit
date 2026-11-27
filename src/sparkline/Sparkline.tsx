import { forwardRef, type ReactElement, type ReactNode, type Ref } from 'react';
import { Part, splitProps, type PartProps, type WithRef } from '../shared';
import { SparklineContext } from './context';
import type { SparklineDatum, SparklineTrend } from './geometry';
import { Area, Bars, Line, Marker, ReferenceLine } from './Marks';
import { sparklineOptionKeys, useSparkline, type UseSparklineOptions } from './useSparkline';

export interface SparklineState {
  /** True when there are no values, only gaps or none at all. */
  empty: boolean;
  trend: SparklineTrend | null;
  decorative: boolean;
}

type ValueProps<T> = [T] extends [SparklineDatum]
  ? { itemToValue?: ((item: T, index: number) => SparklineDatum) | undefined }
  : {
      /** Reads the value of an item. Return `null` for a gap. */
      itemToValue: (item: T, index: number) => SparklineDatum;
    };

type NameProps =
  | {
      /** What the sparkline shows, e.g. "Revenue, last 30 days"; the start of the accessible name. */
      label: string;
      decorative?: false | undefined;
    }
  | {
      /** Hides the sparkline from assistive technology, for when the number next to it says enough. */
      decorative: true;
      label?: undefined;
    };

type SvgProps = Omit<PartProps<'svg', SparklineState>, 'children' | 'width' | 'height' | 'role'>;

export type SparklineProps<T> = Omit<UseSparklineOptions<T>, 'itemToValue' | 'label' | 'decorative'> &
  ValueProps<T> &
  NameProps &
  SvgProps & {
    /** Default: a `Line`. */
    children?: ReactNode;
  };

const Root = forwardRef(function Sparkline<T>({ children, ...props }: SparklineProps<T>, ref: Ref<SVGSVGElement>) {
  // The union of the name props and the conditional itemToValue hide the option keys from splitProps.
  const [options, partProps] = splitProps(props as UseSparklineOptions<T> & SvgProps, sparklineOptionKeys);
  const sparkline = useSparkline(options);
  const state: SparklineState = {
    empty: !sparkline.stats,
    trend: sparkline.stats?.trend ?? null,
    decorative: sparkline.decorative,
  };
  return (
    <SparklineContext.Provider value={sparkline}>
      <Part
        tag="svg"
        state={state}
        ours={{ ...sparkline.getRootProps(), children: children ?? <Line /> }}
        theirs={partProps}
        forwardedRef={ref}
      />
    </SparklineContext.Provider>
  );
});

/**
 * A small line, area or bar chart in SVG that renders the same on the server and in the browser.
 *
 * @experimental
 */
export const Sparkline = Object.assign(Root as <T>(props: WithRef<SparklineProps<T>, SVGSVGElement>) => ReactElement, {
  Line,
  Area,
  Bars,
  Marker,
  ReferenceLine,
});
