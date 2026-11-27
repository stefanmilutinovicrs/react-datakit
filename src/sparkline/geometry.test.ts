import { describe, expect, it } from 'vitest';
import { sparklineGeometry, type SparklineDatum, type SparklineGeometryOptions } from './geometry';

const box: SparklineGeometryOptions = { width: 100, height: 20, xScale: 'point' };
const geometry = (data: readonly SparklineDatum[], options: Partial<SparklineGeometryOptions> = {}) =>
  sparklineGeometry(data, { ...box, ...options });
const xs = (data: readonly SparklineDatum[], options: Partial<SparklineGeometryOptions> = {}) =>
  geometry(data, options).points.map((p) => p?.x ?? null);

describe('sparklineGeometry', () => {
  describe('x scale', () => {
    it('point: the first and last values sit on the edges', () => {
      expect(xs([1, 2, 3, 4, 5])).toEqual([0, 25, 50, 75, 100]);
    });

    it('band: each value sits in the middle of its slot', () => {
      expect(xs([1, 2, 3, 4], { xScale: 'band' })).toEqual([12.5, 37.5, 62.5, 87.5]);
    });

    it('gaps keep their slot', () => {
      expect(xs([1, null, 3, undefined, 5])).toEqual([0, null, 50, null, 100]);
    });
  });

  describe('y scale and domain', () => {
    it('maps the smallest value to the bottom and the largest to the top', () => {
      const { points, domain } = geometry([10, 15, 20]);
      expect(domain).toEqual({ min: 10, max: 20 });
      expect(points.map((p) => p?.y)).toEqual([20, 10, 0]);
    });

    it('takes negative values and mixed signs', () => {
      const { points, domain, baseline } = geometry([-10, 0, 10]);
      expect(domain).toEqual({ min: -10, max: 10 });
      expect(points.map((p) => p?.y)).toEqual([20, 10, 0]);
      expect(baseline).toBe(10);
    });

    it('domain overrides either end and clamps values outside it', () => {
      const { points, domain } = geometry([-5, 5, 50], { domain: { min: 0, max: 10 } });
      expect(domain).toEqual({ min: 0, max: 10 });
      expect(points.map((p) => p?.y)).toEqual([20, 10, 0]);
      expect(points.map((p) => p?.value)).toEqual([-5, 5, 50]);
    });

    it('band includes 0 by default, so bars start at zero', () => {
      expect(geometry([5, 10], { xScale: 'band' }).domain).toEqual({ min: 0, max: 10 });
      expect(geometry([-5, -10], { xScale: 'band' }).domain).toEqual({ min: -10, max: 0 });
      expect(geometry([5, 10], { xScale: 'band', domain: { min: 4 } }).domain).toEqual({ min: 4, max: 10 });
    });

    it('the baseline is 0 clamped to the domain', () => {
      expect(geometry([10, 20]).baseline).toBe(20);
      expect(geometry([-20, -10]).baseline).toBe(0);
    });

    it('inDomain tells whether a value is on the axis', () => {
      const { inDomain } = geometry([10, 20]);
      expect([9, 10, 15, 20, 21].map(inDomain)).toEqual([false, true, true, true, false]);
      expect(geometry([]).inDomain(0)).toBe(false);
    });
  });

  describe('stats', () => {
    it('reads min, max, first, last and the trend, skipping gaps', () => {
      expect(geometry([null, 12, 9, 21, 18, null]).stats).toEqual({
        min: 9,
        max: 21,
        first: 12,
        last: 18,
        minIndex: 2,
        maxIndex: 3,
        firstIndex: 1,
        lastIndex: 4,
        count: 4,
        trend: 'up',
      });
    });

    it('a tie marks the first occurrence', () => {
      const stats = geometry([3, 1, 5, 1, 5]).stats;
      expect(stats?.minIndex).toBe(1);
      expect(stats?.maxIndex).toBe(2);
    });

    it.each([
      [[1, 3], 'up'],
      [[3, 1], 'down'],
      [[2, 5, 2], 'flat'],
    ] as const)('trend of %j is %s', (data, trend) => {
      expect(geometry(data).stats?.trend).toBe(trend);
    });
  });

  describe('paths', () => {
    it('line: one subpath through every value', () => {
      expect(geometry([10, 20, 15]).linePath).toBe('M0 20L50 0L100 10');
    });

    it('line: gaps split it, and an isolated value is a zero-length subpath', () => {
      expect(geometry([10, 20, null, 15, null, 10, 20]).linePath).toBe('M0 20L16.67 0M50 10h0M83.33 20L100 0');
    });

    it('area: closes each run of two or more values on the baseline', () => {
      expect(geometry([10, 20, null, 15, null, 10, 20]).areaPath).toBe(
        'M0 20L0 20L16.67 0L16.67 20ZM83.33 20L83.33 20L100 0L100 20Z',
      );
    });

    it('bars: grow from the baseline, up for positive and down for negative values', () => {
      expect(geometry([10, -10, null, 0], { xScale: 'band', width: 80 }).barsPath(0.5)).toBe(
        'M5 0h10v10h-10ZM25 10h10v10h-10Z',
      );
    });

    it('bars: gap is clamped to 0–1', () => {
      expect(geometry([10], { xScale: 'band', width: 10 }).barsPath(-1)).toBe('M0 0h10v20h-10Z');
      expect(geometry([10], { xScale: 'band', width: 10 }).barsPath(2)).toBe('M5 0h0v20h0Z');
    });

    it('rounds coordinates to two decimals and never writes -0', () => {
      const { linePath } = geometry([0, 1, 2], { width: 1, height: 3 });
      expect(linePath).toBe('M0 3L0.5 1.5L1 0');
      expect(geometry([-0.001, 0.001], { height: 0.001 }).linePath).not.toContain('-0 ');
    });
  });

  describe('edge cases', () => {
    it.each([
      ['empty', []],
      ['only gaps', [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]],
    ])('%s: no stats, no domain and empty paths', (_, data: readonly SparklineDatum[]) => {
      const g = geometry(data);
      expect(g.stats).toBeNull();
      expect(g.domain).toBeNull();
      expect(g.points.every((p) => p === null)).toBe(true);
      expect([g.linePath, g.areaPath, g.barsPath(0.25)]).toEqual(['', '', '']);
    });

    it('a single value is a dot in the middle', () => {
      const g = geometry([42]);
      expect(g.points).toEqual([{ index: 0, value: 42, x: 50, y: 10 }]);
      expect(g.linePath).toBe('M50 10h0');
      expect(g.areaPath).toBe('');
      expect(g.stats).toMatchObject({ count: 1, trend: 'flat', first: 42, last: 42 });
    });

    it('equal values make a flat line through the middle', () => {
      const g = geometry([7, 7, 7]);
      expect(g.linePath).toBe('M0 10L50 10L100 10');
      expect(g.stats?.trend).toBe('flat');
    });

    it('non-finite numbers are gaps', () => {
      expect(geometry([1, Number.NaN, Number.NEGATIVE_INFINITY, 2]).points.map((p) => p?.value ?? null)).toEqual([
        1,
        null,
        null,
        2,
      ]);
    });
  });
});
