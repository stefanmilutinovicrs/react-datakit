import { createRef } from 'react';
import { expectTypeOf } from 'vitest';
import { Sparkline, useSparkline, type SparklineMarkerState, type SparklineState } from './index';

interface Day {
  date: string;
  total: number | null;
}
const days: Day[] = [{ date: '2026-11-01', total: 4 }];

export function Numbers() {
  return (
    <>
      <Sparkline data={[1, 2, null, undefined]} label="Visits" />
      <Sparkline data={[1, 2]} decorative />
      <Sparkline
        data={[1, 2]}
        label="Visits"
        ref={createRef<SVGSVGElement>()}
        className={(state) => {
          expectTypeOf(state).toEqualTypeOf<SparklineState>();
          return undefined;
        }}
      >
        <Sparkline.Marker
          at="last"
          className={(state) => {
            expectTypeOf(state).toEqualTypeOf<SparklineMarkerState>();
            return undefined;
          }}
        />
        <Sparkline.Marker at={3} />
        {/* @ts-expect-error: a statistic or an index */}
        <Sparkline.Marker at="median" />
        <Sparkline.ReferenceLine value={0} ref={createRef<SVGPathElement>()} />
      </Sparkline>
    </>
  );
}

export function Objects() {
  return (
    <>
      <Sparkline
        data={days}
        label="Total"
        itemToValue={(day, index) => {
          expectTypeOf(day).toEqualTypeOf<Day>();
          expectTypeOf(index).toEqualTypeOf<number>();
          return day.total;
        }}
      />
      {/* @ts-expect-error: objects need itemToValue */}
      <Sparkline data={days} label="Total" />
      {/* @ts-expect-error: itemToValue returns a number, null or undefined */}
      <Sparkline data={days} label="Total" itemToValue={(day) => day.date} />
    </>
  );
}

export function Names() {
  return (
    <>
      {/* @ts-expect-error: a label, or decorative */}
      <Sparkline data={[1]} />
      {/* @ts-expect-error: a decorative sparkline has no name */}
      <Sparkline data={[1]} decorative label="Visits" />
    </>
  );
}

export function Hook() {
  const sparkline = useSparkline({ data: days, itemToValue: (day) => day.total, label: 'Total' });
  expectTypeOf(sparkline.ariaLabel).toEqualTypeOf<string | null>();
  expectTypeOf(sparkline.linePath).toEqualTypeOf<string>();
  return null;
}
