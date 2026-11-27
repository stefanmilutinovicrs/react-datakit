import { forwardRef, useEffect } from 'react';
import { Part, isDev, sparklineParts, type PartProps } from '../shared';
import { useSparklineContext } from './context';
import { dot, n, type SparklinePoint } from './geometry';

// Strokes keep their CSS width however far the viewBox is stretched, and zero-length subpaths
// need round caps to show up as dots at all.
const unscaled = { vectorEffect: 'non-scaling-stroke' } as const;
const dots = { ...unscaled, strokeLinecap: 'round' } as const;

export interface SparklineMarkState {
  /** True when there is no value to draw. */
  empty: boolean;
}

export type SparklineLineProps = PartProps<'path', SparklineMarkState>;

export const Line = forwardRef<SVGPathElement, SparklineLineProps>(function Line(props, ref) {
  const { linePath, stats } = useSparklineContext('Line');
  return (
    <Part
      tag="path"
      state={{ empty: !stats }}
      ours={{ ...dots, d: linePath, 'data-dk-part': sparklineParts.line }}
      theirs={props}
      forwardedRef={ref}
    />
  );
});

export type SparklineAreaProps = PartProps<'path', SparklineMarkState>;

export const Area = forwardRef<SVGPathElement, SparklineAreaProps>(function Area(props, ref) {
  const { areaPath, stats } = useSparklineContext('Area');
  return (
    <Part
      tag="path"
      state={{ empty: !stats }}
      ours={{ d: areaPath, 'data-dk-part': sparklineParts.area }}
      theirs={props}
      forwardedRef={ref}
    />
  );
});

export type SparklineBarsProps = PartProps<'path', SparklineMarkState> & {
  /** Share of each slot left empty between bars, from 0 to 1. Default: 0.25. */
  gap?: number | undefined;
};

/** Bars from zero, all in one path; use them with `xScale="band"` on the root. */
export const Bars = forwardRef<SVGPathElement, SparklineBarsProps>(function Bars({ gap = 0.25, ...props }, ref) {
  const { barsPath, stats } = useSparklineContext('Bars');
  return (
    <Part
      tag="path"
      state={{ empty: !stats }}
      ours={{ d: barsPath(gap), 'data-dk-part': sparklineParts.bars }}
      theirs={props}
      forwardedRef={ref}
    />
  );
});

export type SparklineMarkerAt = 'min' | 'max' | 'first' | 'last' | number;

export interface SparklineMarkerState {
  at: SparklineMarkerAt;
  /** Index of the marked value in `data`. */
  index: number;
  value: number;
}

export type SparklineMarkerProps = PartProps<'path', SparklineMarkerState> & {
  /** The value to mark: a statistic, or an index in `data`. A min or max that occurs more than once marks the first. */
  at: SparklineMarkerAt;
};

/** A dot on one value. Renders nothing when that value is a gap or there are no values. */
export const Marker = forwardRef<SVGPathElement, SparklineMarkerProps>(function Marker({ at, ...props }, ref) {
  const { points, stats } = useSparklineContext('Marker');
  const index =
    typeof at === 'number'
      ? at
      : stats
        ? { min: stats.minIndex, max: stats.maxIndex, first: stats.firstIndex, last: stats.lastIndex }[at]
        : -1;
  const point: SparklinePoint | null | undefined = points[index];
  if (!point) return null;
  return (
    <Part
      tag="path"
      state={{ at, index, value: point.value }}
      ours={{ ...dots, d: dot(point.x, point.y), 'data-dk-part': sparklineParts.marker, 'data-at': String(at) }}
      theirs={props}
      forwardedRef={ref}
    />
  );
});

export interface SparklineReferenceLineState {
  value: number;
}

export type SparklineReferenceLineProps = PartProps<'path', SparklineReferenceLineState> & {
  value: number;
};

/**
 * A horizontal line at a value, such as a target or zero. It isn't drawn when the value is outside the y axis (a
 * warning says so in development); include it with `domain` on the root.
 */
export const ReferenceLine = forwardRef<SVGPathElement, SparklineReferenceLineProps>(function ReferenceLine(
  { value, ...props },
  ref,
) {
  const { y, inDomain, width, stats, domain } = useSparklineContext('ReferenceLine');
  const visible = inDomain(value);
  useEffect(() => {
    if (isDev() && stats && !visible && domain) {
      console.warn(
        `react-datakit: <Sparkline.ReferenceLine value={${value}}> is outside the y axis (${domain.min} to ${domain.max}) and isn't drawn. Include it with \`domain\` on <Sparkline>.`,
      );
    }
  }, [stats, visible, value, domain]);
  if (!visible) return null;
  return (
    <Part
      tag="path"
      state={{ value }}
      ours={{ ...unscaled, d: `M0 ${n(y(value))}H${n(width)}`, 'data-dk-part': sparklineParts.referenceLine }}
      theirs={props}
      forwardedRef={ref}
    />
  );
});
