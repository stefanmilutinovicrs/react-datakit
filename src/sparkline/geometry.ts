/** A value of a sparkline; `null`, `undefined` and non-finite numbers are gaps. */
export type SparklineDatum = number | null | undefined;

export type SparklineTrend = 'up' | 'down' | 'flat';

export interface SparklinePoint {
  index: number;
  value: number;
  x: number;
  y: number;
}

export interface SparklineStats {
  min: number;
  max: number;
  first: number;
  last: number;
  /** Index of the first occurrence of the smallest value. */
  minIndex: number;
  /** Index of the first occurrence of the largest value. */
  maxIndex: number;
  firstIndex: number;
  lastIndex: number;
  /** Number of values that aren't gaps. */
  count: number;
  /** The last value compared with the first. */
  trend: SparklineTrend;
}

export interface SparklineDomain {
  min?: number | undefined;
  max?: number | undefined;
}

export interface SparklineGeometryOptions {
  width: number;
  height: number;
  xScale: 'point' | 'band';
  domain?: SparklineDomain | undefined;
}

export interface SparklineGeometry {
  width: number;
  height: number;
  /** One entry per datum, `null` for a gap. */
  points: (SparklinePoint | null)[];
  stats: SparklineStats | null;
  /** The y axis after defaults and `domain`, or null without values. */
  domain: { min: number; max: number } | null;
  /** The y coordinate of a value, clamped to the domain. */
  y: (value: number) => number;
  /** Whether a value lies inside the domain. */
  inDomain: (value: number) => boolean;
  /** The y coordinate that Area and Bars fill to: 0, clamped to the domain. */
  baseline: number;
  linePath: string;
  areaPath: string;
  barsPath: (gap: number) => string;
}

// Two decimals are far below a pixel at any sensible size and keep the markup short.
export const n = (value: number) => String(Math.round(value * 100) / 100 + 0);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** A point as a zero-length subpath: with round caps it renders as a dot as wide as the stroke. */
export const dot = (x: number, y: number) => `M${n(x)} ${n(y)}h0`;

export function sparklineGeometry(
  data: readonly SparklineDatum[],
  { width, height, xScale, domain }: SparklineGeometryOptions,
): SparklineGeometry {
  const count = data.length;
  const slot = count > 0 ? width / count : width;
  const xAt = (index: number) =>
    xScale === 'band' ? (index + 0.5) * slot : count > 1 ? (index / (count - 1)) * width : width / 2;

  let stats: SparklineStats | null = null;
  for (const [index, value] of data.entries()) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    stats ??= {
      min: value,
      max: value,
      first: value,
      last: value,
      minIndex: index,
      maxIndex: index,
      firstIndex: index,
      lastIndex: index,
      count: 0,
      trend: 'flat',
    };
    stats.count++;
    stats.last = value;
    stats.lastIndex = index;
    if (value < stats.min) {
      stats.min = value;
      stats.minIndex = index;
    }
    if (value > stats.max) {
      stats.max = value;
      stats.maxIndex = index;
    }
  }
  if (stats) stats.trend = stats.last > stats.first ? 'up' : stats.last < stats.first ? 'down' : 'flat';

  // A bar's length has to start at zero, so bars always show 0 unless `domain` says otherwise.
  const withZero = xScale === 'band';
  const resolved = stats
    ? {
        min: domain?.min ?? (withZero ? Math.min(stats.min, 0) : stats.min),
        max: domain?.max ?? (withZero ? Math.max(stats.max, 0) : stats.max),
      }
    : null;
  const y = (value: number) => {
    if (!resolved || resolved.max <= resolved.min) return height / 2;
    const ratio = (clamp(value, resolved.min, resolved.max) - resolved.min) / (resolved.max - resolved.min);
    return height - ratio * height;
  };
  const inDomain = (value: number) => resolved !== null && value >= resolved.min && value <= resolved.max;
  const baseline = resolved && resolved.max > resolved.min ? y(0) : height;

  const points = data.map((value, index): SparklinePoint | null =>
    typeof value === 'number' && Number.isFinite(value) ? { index, value, x: xAt(index), y: y(value) } : null,
  );

  const runs: SparklinePoint[][] = [];
  let run: SparklinePoint[] = [];
  for (const point of points) {
    if (point) run.push(point);
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);

  const linePath = runs
    .map(([start, ...rest]) =>
      !start
        ? ''
        : rest.length === 0
          ? dot(start.x, start.y)
          : `M${n(start.x)} ${n(start.y)}${rest.map((p) => `L${n(p.x)} ${n(p.y)}`).join('')}`,
    )
    .join('');

  const areaPath = runs
    .filter((r) => r.length > 1)
    .map((r) => {
      const first = r[0] as SparklinePoint;
      const last = r[r.length - 1] as SparklinePoint;
      return `M${n(first.x)} ${n(baseline)}${r.map((p) => `L${n(p.x)} ${n(p.y)}`).join('')}L${n(last.x)} ${n(baseline)}Z`;
    })
    .join('');

  const barsPath = (gap: number) => {
    const barWidth = slot * (1 - clamp(gap, 0, 1));
    return points
      .map((p) => {
        if (!p || p.y === baseline) return '';
        const top = Math.min(p.y, baseline);
        return `M${n(p.x - barWidth / 2)} ${n(top)}h${n(barWidth)}v${n(Math.abs(p.y - baseline))}h${n(-barWidth)}Z`;
      })
      .join('');
  };

  return { width, height, points, stats, domain: resolved, y, inDomain, baseline, linePath, areaPath, barsPath };
}
