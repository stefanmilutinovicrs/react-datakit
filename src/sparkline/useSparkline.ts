import { useEffect, useMemo } from 'react';
import { isDev, optionKeys, plainSpaces, sparklineParts, type DataAttributes } from '../shared';
import {
  sparklineGeometry,
  type SparklineDatum,
  type SparklineDomain,
  type SparklineGeometry,
  type SparklineTrend,
} from './geometry';

/** The formatted numbers that `labels.summary` puts into the accessible name. */
export interface SparklineSummary {
  label: string;
  trend: SparklineTrend;
  first: string;
  last: string;
  min: string;
  max: string;
  /** Number of values that aren't gaps. */
  count: number;
}

export interface SparklineLabels {
  /** The accessible name of a sparkline with values. */
  summary: (summary: SparklineSummary) => string;
  /** The accessible name of a sparkline without values. */
  empty: (label: string) => string;
}

export const defaultSparklineLabels: SparklineLabels = {
  summary: ({ label, trend, first, last, min, max, count }) =>
    count === 1
      ? `${label}: ${last}`
      : min === max
        ? `${label}: ${count} values, all ${last}`
        : `${label}: ${trend === 'flat' ? `unchanged at ${last}` : `${trend} from ${first} to ${last}`}, low ${min}, high ${max}`,
  empty: (label) => `${label}: no data`,
};

export interface UseSparklineOptions<T> {
  data: readonly T[];
  /** Reads the value of an item; required unless the items are numbers. Return `null` for a gap. */
  itemToValue?: ((item: T, index: number) => SparklineDatum) | undefined;
  /** Width of the viewBox, and of the element before CSS sizes it. Default: 96. */
  width?: number | undefined;
  /** Height of the viewBox, and of the element before CSS sizes it. Default: 24. */
  height?: number | undefined;
  /** `'band'` puts each value in the middle of its own slot, for `Bars`. Default: `'point'`, from edge to edge. */
  xScale?: 'point' | 'band' | undefined;
  /**
   * Ends of the y axis; values outside are drawn at the edge. Default: the smallest and largest value, and with
   * `xScale="band"` also 0.
   */
  domain?: SparklineDomain | undefined;
  /** BCP 47 locale of the numbers in the accessible name. Default: the runtime's locale; pass it when rendering on the server. */
  locale?: string | undefined;
  formatOptions?: Intl.NumberFormatOptions | undefined;
  labels?: Partial<SparklineLabels> | undefined;
  /** What the sparkline shows, e.g. "Revenue, last 30 days"; the start of the accessible name. */
  label?: string | undefined;
  /** Hides the sparkline from assistive technology, for when the number next to it says enough. */
  decorative?: boolean | undefined;
}

export const sparklineOptionKeys = optionKeys<UseSparklineOptions<unknown>>()([
  'data',
  'itemToValue',
  'width',
  'height',
  'xScale',
  'domain',
  'locale',
  'formatOptions',
  'labels',
  'label',
  'decorative',
]);

export interface UseSparklineReturn extends SparklineGeometry {
  xScale: 'point' | 'band';
  /** The accessible name, or null when decorative. */
  ariaLabel: string | null;
  decorative: boolean;
  /** Formats a number for the locale, with plain spaces so server and client text match. */
  formatValue: (value: number) => string;
  getRootProps: () => DataAttributes & {
    viewBox: string;
    width: number;
    height: number;
    preserveAspectRatio: 'none';
    role?: 'img';
    'aria-label'?: string;
    'aria-hidden'?: true;
  };
}

const numberFormats = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: string | undefined, options: Intl.NumberFormatOptions | undefined): Intl.NumberFormat {
  const key = `${locale ?? ''}${JSON.stringify(options ?? {})}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, options);
    numberFormats.set(key, format);
  }
  return format;
}

/**
 * Computes the geometry, statistics and accessible name of a sparkline.
 *
 * @experimental
 */
export function useSparkline<T>(options: UseSparklineOptions<T>): UseSparklineReturn {
  const {
    data,
    itemToValue,
    width = 96,
    height = 24,
    xScale = 'point',
    domain,
    locale,
    formatOptions,
    label = '',
    decorative = false,
  } = options;
  const domainMin = domain?.min;
  const domainMax = domain?.max;

  const geometry = useMemo(
    () =>
      sparklineGeometry(itemToValue ? data.map(itemToValue) : (data as readonly SparklineDatum[]), {
        width,
        height,
        xScale,
        domain: { min: domainMin, max: domainMax },
      }),
    [data, itemToValue, width, height, xScale, domainMin, domainMax],
  );

  useEffect(() => {
    if (isDev() && !decorative && !label) {
      console.warn('react-datakit: <Sparkline> needs a `label`, or `decorative` when the text next to it says enough.');
    }
  }, [decorative, label]);

  const format = numberFormat(locale, formatOptions);
  const formatValue = (value: number) => plainSpaces(format.format(value));
  const labels = { ...defaultSparklineLabels, ...options.labels };
  const { stats } = geometry;
  const ariaLabel = decorative
    ? null
    : stats
      ? labels.summary({
          label,
          trend: stats.trend,
          first: formatValue(stats.first),
          last: formatValue(stats.last),
          min: formatValue(stats.min),
          max: formatValue(stats.max),
          count: stats.count,
        })
      : labels.empty(label);

  return {
    ...geometry,
    xScale,
    ariaLabel,
    decorative,
    formatValue,
    getRootProps: () => ({
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      preserveAspectRatio: 'none',
      ...(ariaLabel === null ? { 'aria-hidden': true } : { role: 'img', 'aria-label': ariaLabel }),
      'data-dk-part': sparklineParts.root,
      'data-trend': stats?.trend,
      'data-empty': stats ? undefined : '',
    }),
  };
}
