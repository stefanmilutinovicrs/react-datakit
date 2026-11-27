import { createRef } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import '../styles/theme.css';
import { sparklineParts } from '../shared';
import { expectNoA11yViolations } from '../test/axe';
import { hydrationErrors } from '../test/hydration';
import { expectNoOptionsOnDom } from '../test/options';
import { sparklineOptionKeys } from './useSparkline';
import { Sparkline, defaultSparklineLabels, type SparklineState } from './index';

const revenue = [12, 9, 21, 18];
const part = (name: string) => document.querySelector(`[data-dk-part="${name}"]`);
const parts = (name: string) => [...document.querySelectorAll(`[data-dk-part="${name}"]`)];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Sparkline', () => {
  it('passes no hook option to the DOM', async () => {
    await expectNoOptionsOnDom(
      async () => {
        await render(
          <Sparkline
            data-testid="root"
            data={[{ v: 1 }, { v: 2 }]}
            itemToValue={(item) => item.v}
            width={80}
            height={20}
            xScale="band"
            domain={{ min: 0, max: 4 }}
            locale="en-US"
            formatOptions={{ style: 'percent' }}
            labels={{ empty: () => 'Nothing' }}
            label="Share"
          />,
        );
        return page.getByTestId('root').element();
        // width and height are also the SVG's own size before CSS.
      },
      sparklineOptionKeys.filter((key) => key !== 'width' && key !== 'height'),
    );
  });

  describe('ARIA', () => {
    it('is an image named by the label and a summary of the values', async () => {
      await render(<Sparkline data={revenue} label="Revenue" locale="en-US" />);
      const image = page.getByRole('img', { name: 'Revenue: up from 12 to 18, low 9, high 21' });
      await expect.element(image).toBeInTheDocument();
      expect(image.element().tagName).toBe('svg');
    });

    it.each([
      ['down', [5, 9, 2], 'Sales: down from 5 to 2, low 2, high 9'],
      ['flat with a range', [5, 9, 5], 'Sales: unchanged at 5, low 5, high 9'],
      ['equal values', [4, 4, 4], 'Sales: 3 values, all 4'],
      ['a single value', [4], 'Sales: 4'],
      ['gaps', [null, 3, undefined, 7, Number.NaN], 'Sales: up from 3 to 7, low 3, high 7'],
      ['negative values', [-3, 2, -8], 'Sales: down from -3 to -8, low -8, high 2'],
      ['no values', [], 'Sales: no data'],
      ['only gaps', [null, null], 'Sales: no data'],
    ])('names %s', async (_, data: (number | null | undefined)[], name) => {
      await render(<Sparkline data={data} label="Sales" locale="en-US" />);
      await expect.element(page.getByRole('img', { name })).toBeInTheDocument();
    });

    it('formats the numbers for the locale with plain spaces', async () => {
      await render(
        <Sparkline
          data={[1234.5, 20000]}
          label="Umsatz"
          locale="fr-FR"
          formatOptions={{ style: 'currency', currency: 'EUR' }}
        />,
      );
      const name = page.getByRole('img').element().getAttribute('aria-label') ?? '';
      expect(name).not.toMatch(/[\u00a0\u2009\u202f]/);
      expect(name).toBe('Umsatz: up from 1 234,50 € to 20 000,00 €, low 1 234,50 €, high 20 000,00 €');
    });

    it('labels replaces the summary and the empty text', async () => {
      const summary = vi.fn(() => 'Umsatz steigt');
      const { rerender } = await render(
        <Sparkline data={revenue} label="Umsatz" locale="de-DE" labels={{ summary }} />,
      );
      await expect.element(page.getByRole('img', { name: 'Umsatz steigt' })).toBeInTheDocument();
      expect(summary).toHaveBeenLastCalledWith({
        label: 'Umsatz',
        trend: 'up',
        first: '12',
        last: '18',
        min: '9',
        max: '21',
        count: 4,
      });
      await rerender(<Sparkline data={[]} label="Umsatz" labels={{ empty: (label) => `${label}: keine Daten` }} />);
      await expect.element(page.getByRole('img', { name: 'Umsatz: keine Daten' })).toBeInTheDocument();
      expect(defaultSparklineLabels.empty('X')).toBe('X: no data');
    });

    it('decorative hides it from assistive technology', async () => {
      await render(
        <p>
          18 <Sparkline data={revenue} decorative />
        </p>,
      );
      const svg = part(sparklineParts.root) as SVGSVGElement;
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.hasAttribute('role')).toBe(false);
      expect(svg.hasAttribute('aria-label')).toBe(false);
      expect(page.getByRole('img').elements()).toEqual([]);
    });

    it('has nothing focusable', async () => {
      await render(
        <Sparkline data={revenue} label="Revenue">
          <Sparkline.Area />
          <Sparkline.Line />
          <Sparkline.Marker at="last" />
          <Sparkline.ReferenceLine value={10} />
        </Sparkline>,
      );
      const svg = part(sparklineParts.root) as SVGSVGElement;
      expect(svg.querySelectorAll('[tabindex], a').length).toBe(0);
      expect(svg.tabIndex).toBe(-1);
    });

    it('warns in development when there is neither a label nor decorative', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const props = { data: revenue } as unknown as { data: number[]; decorative: true };
      await render(<Sparkline {...props} />);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('<Sparkline> needs a `label`'));
    });

    it.each([
      ['line', <Sparkline.Line key="l" />],
      ['area and line', [<Sparkline.Area key="a" />, <Sparkline.Line key="l" />]],
      ['bars', <Sparkline.Bars key="b" />],
      [
        'markers and a reference line',
        [
          <Sparkline.ReferenceLine key="r" value={15} />,
          <Sparkline.Line key="l" />,
          <Sparkline.Marker key="min" at="min" />,
          <Sparkline.Marker key="max" at="max" />,
          <Sparkline.Marker key="last" at="last" />,
        ],
      ],
    ])('passes axe with %s', async (name, children) => {
      await render(
        <div data-testid="frame">
          <Sparkline data={revenue} label="Revenue" xScale={name === 'bars' ? 'band' : 'point'}>
            {children}
          </Sparkline>
        </div>,
      );
      await expectNoA11yViolations(page.getByTestId('frame').element());
    });

    it.each([
      ['empty', <Sparkline key="e" data={[]} label="Revenue" />],
      [
        'decorative',
        <p key="d">
          Revenue 18 <Sparkline data={revenue} decorative />
        </p>,
      ],
    ])('passes axe when %s', async (_, element) => {
      await render(<div data-testid="frame">{element}</div>);
      await expectNoA11yViolations(page.getByTestId('frame').element());
    });
  });

  describe('root', () => {
    it('renders an SVG that stretches to its CSS size, with a Line by default', async () => {
      await render(<Sparkline data={revenue} label="Revenue" />);
      const svg = part(sparklineParts.root) as SVGSVGElement;
      expect(svg.getAttribute('viewBox')).toBe('0 0 96 24');
      expect(svg.getAttribute('width')).toBe('96');
      expect(svg.getAttribute('height')).toBe('24');
      expect(svg.getAttribute('preserveAspectRatio')).toBe('none');
      expect(svg.getAttribute('data-trend')).toBe('up');
      expect(svg.hasAttribute('data-empty')).toBe(false);
      expect(parts(sparklineParts.line)).toHaveLength(1);
    });

    it('width and height set the viewBox', async () => {
      await render(<Sparkline data={revenue} label="Revenue" width={200} height={40} />);
      expect(part(sparklineParts.root)?.getAttribute('viewBox')).toBe('0 0 200 40');
    });

    it('marks an empty sparkline', async () => {
      await render(<Sparkline data={[null]} label="Revenue" />);
      const svg = part(sparklineParts.root) as SVGSVGElement;
      expect(svg.getAttribute('data-empty')).toBe('');
      expect(svg.hasAttribute('data-trend')).toBe(false);
      expect(part(sparklineParts.line)?.getAttribute('d')).toBe('');
    });

    it('reads objects through itemToValue', async () => {
      const rows = [
        { day: 1, total: 4 },
        { day: 2, total: null },
        { day: 3, total: 8 },
      ];
      await render(<Sparkline data={rows} itemToValue={(row) => row.total} label="Total" locale="en-US" />);
      await expect.element(page.getByRole('img', { name: 'Total: up from 4 to 8, low 4, high 8' })).toBeInTheDocument();
      expect(part(sparklineParts.line)?.getAttribute('d')).toBe('M0 24h0M96 0h0');
    });

    it('takes className as a function of the state, style, render, ref and other props', async () => {
      const ref = createRef<SVGSVGElement>();
      const states: SparklineState[] = [];
      await render(
        <Sparkline
          ref={ref}
          data={revenue}
          label="Revenue"
          className={(state) => {
            states.push(state);
            return `trend-${state.trend ?? 'none'}`;
          }}
          style={{ width: 120 }}
          data-testid="spark"
          render={(props, state) => <svg {...props} data-decorative={String(state.decorative)} />}
        />,
      );
      const svg = page.getByTestId('spark').element() as SVGSVGElement;
      expect(ref.current).toBe(svg);
      expect(svg.getAttribute('class')).toBe('trend-up');
      expect(svg.style.width).toBe('120px');
      expect(svg.getAttribute('data-decorative')).toBe('false');
      expect(states.at(-1)).toEqual({ empty: false, trend: 'up', decorative: false });
    });

    it('parts outside a Sparkline throw', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => renderToString(<Sparkline.Line />)).toThrow('<Sparkline.Line> must be rendered inside <Sparkline>');
    });
  });

  describe('parts', () => {
    it.each([
      ['Line', Sparkline.Line, sparklineParts.line],
      ['Area', Sparkline.Area, sparklineParts.area],
      ['Bars', Sparkline.Bars, sparklineParts.bars],
    ] as const)('%s takes className, style, render, ref and other props', async (_, Mark, name) => {
      const ref = createRef<SVGPathElement>();
      const className = vi.fn(({ empty }: { empty: boolean }) => (empty ? 'empty' : 'full'));
      await render(
        <Sparkline data={revenue} label="Revenue">
          <Mark
            ref={ref}
            className={className}
            style={{ opacity: 0.5 }}
            data-testid="mark"
            render={(props) => <path {...props} data-custom="" />}
          />
        </Sparkline>,
      );
      const path = page.getByTestId('mark').element() as SVGPathElement;
      expect(ref.current).toBe(path);
      expect(path.getAttribute('data-dk-part')).toBe(name);
      expect(path.getAttribute('class')).toBe('full');
      expect(path.style.opacity).toBe('0.5');
      expect(path.hasAttribute('data-custom')).toBe(true);
      expect(className).toHaveBeenLastCalledWith({ empty: false });
      expect(path.getAttribute('d')).not.toBe('');
    });

    it('Line keeps its stroke width however far the SVG stretches, and draws isolated values as dots', async () => {
      await render(<Sparkline data={[1, 2, null, 3, null, 2, 1]} label="Visits" style={{ width: 400, height: 40 }} />);
      const line = part(sparklineParts.line) as SVGPathElement;
      expect(line.getAttribute('vector-effect')).toBe('non-scaling-stroke');
      expect(line.getAttribute('stroke-linecap')).toBe('round');
      expect(line.getAttribute('d')).toContain('M48 0h0');
      expect(getComputedStyle(line).strokeWidth).toBe('1.5px');
    });

    it('Area closes on the baseline', async () => {
      await render(
        <Sparkline data={[-2, 2]} label="Delta" width={10} height={10}>
          <Sparkline.Area />
        </Sparkline>,
      );
      expect(part(sparklineParts.area)?.getAttribute('d')).toBe('M0 5L0 10L10 0L10 5Z');
    });

    it('Bars take gap', async () => {
      await render(
        <Sparkline data={[2, 4]} label="Count" xScale="band" width={20} height={10}>
          <Sparkline.Bars gap={0} />
        </Sparkline>,
      );
      expect(part(sparklineParts.bars)?.getAttribute('d')).toBe('M0 5h10v5h-10ZM10 0h10v10h-10Z');
    });

    describe('Marker', () => {
      it.each([
        ['min', 1, 9],
        ['max', 2, 21],
        ['first', 0, 12],
        ['last', 3, 18],
        [2, 2, 21],
      ] as const)('at=%s marks index %i', async (at, index, value) => {
        const className = vi.fn(() => 'marker');
        await render(
          <Sparkline data={revenue} label="Revenue" width={30} height={12}>
            <Sparkline.Marker at={at} className={className} />
          </Sparkline>,
        );
        const marker = part(sparklineParts.marker) as SVGPathElement;
        expect(marker.getAttribute('data-at')).toBe(String(at));
        expect(marker.getAttribute('d')).toMatch(new RegExp(`^M${index * 10} [\\d.]+h0$`));
        expect(marker.getAttribute('stroke-linecap')).toBe('round');
        expect(marker.getAttribute('vector-effect')).toBe('non-scaling-stroke');
        expect(className).toHaveBeenLastCalledWith({ at, index, value });
      });

      it('marks a value isolated between two gaps by index', async () => {
        await render(
          <Sparkline data={[3, 5, null, 4, null, 6, 7]} label="Visits" width={60} height={10}>
            <Sparkline.Line />
            <Sparkline.Marker at={3} />
          </Sparkline>,
        );
        expect(part(sparklineParts.marker)?.getAttribute('d')).toBe('M30 7.5h0');
      });

      it('renders nothing on a gap, out of range or without values', async () => {
        const { rerender } = await render(
          <Sparkline data={[1, null, 2]} label="Visits">
            <Sparkline.Marker at={1} />
            <Sparkline.Marker at={7} />
            <Sparkline.Marker at={-1} />
          </Sparkline>,
        );
        expect(parts(sparklineParts.marker)).toEqual([]);
        await rerender(
          <Sparkline data={[]} label="Visits">
            <Sparkline.Marker at="last" />
          </Sparkline>,
        );
        expect(parts(sparklineParts.marker)).toEqual([]);
      });

      it('takes style, render, ref and other props', async () => {
        const ref = createRef<SVGPathElement>();
        await render(
          <Sparkline data={revenue} label="Revenue">
            <Sparkline.Marker
              at="last"
              ref={ref}
              style={{ strokeWidth: '8px' }}
              data-testid="marker"
              render={(props, state) => <path {...props} data-value={state.value} />}
            />
          </Sparkline>,
        );
        const marker = page.getByTestId('marker').element() as SVGPathElement;
        expect(ref.current).toBe(marker);
        expect(marker.style.strokeWidth).toBe('8px');
        expect(marker.getAttribute('data-value')).toBe('18');
      });
    });

    describe('ReferenceLine', () => {
      it('draws a horizontal line across at the value', async () => {
        const ref = createRef<SVGPathElement>();
        await render(
          <Sparkline data={[0, 20]} label="Load" width={50} height={10}>
            <Sparkline.ReferenceLine
              value={15}
              ref={ref}
              className={({ value }) => `at-${value}`}
              style={{ opacity: 0.5 }}
              data-testid="ref"
              render={(props) => <path {...props} data-custom="" />}
            />
          </Sparkline>,
        );
        const line = page.getByTestId('ref').element() as SVGPathElement;
        expect(ref.current).toBe(line);
        expect(line.getAttribute('data-dk-part')).toBe(sparklineParts.referenceLine);
        expect(line.getAttribute('d')).toBe('M0 2.5H50');
        expect(line.getAttribute('class')).toBe('at-15');
        expect(line.style.opacity).toBe('0.5');
        expect(line.hasAttribute('data-custom')).toBe(true);
        expect(line.getAttribute('vector-effect')).toBe('non-scaling-stroke');
      });

      it('outside the y axis is not drawn, and warns in development', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await render(
          <Sparkline data={[10, 20]} label="Load">
            <Sparkline.ReferenceLine value={25} />
          </Sparkline>,
        );
        expect(parts(sparklineParts.referenceLine)).toEqual([]);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('value={25}> is outside the y axis (10 to 20)'));
      });

      it('domain brings it onto the axis', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await render(
          <Sparkline data={[10, 20]} label="Load" domain={{ max: 25 }}>
            <Sparkline.ReferenceLine value={25} />
          </Sparkline>,
        );
        expect(part(sparklineParts.referenceLine)?.getAttribute('d')).toBe('M0 0H96');
        expect(warn).not.toHaveBeenCalled();
      });

      it('without values draws nothing and stays quiet', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await render(
          <Sparkline data={[]} label="Load">
            <Sparkline.ReferenceLine value={0} />
          </Sparkline>,
        );
        expect(parts(sparklineParts.referenceLine)).toEqual([]);
        expect(warn).not.toHaveBeenCalled();
      });
    });
  });

  describe('SSR', () => {
    it('hydrates server-rendered markup without warnings', async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      const tree = (
        <Sparkline data={[1234.5, null, 9876.25, 20000]} label="Chiffre d’affaires" locale="fr-FR" xScale="band">
          <Sparkline.ReferenceLine value={5000} />
          <Sparkline.Bars />
          <Sparkline.Area />
          <Sparkline.Line />
          <Sparkline.Marker at="max" />
        </Sparkline>
      );
      const container = document.createElement('div');
      container.innerHTML = renderToString(tree);
      document.body.append(container);
      const root = hydrateRoot(container, tree, { onRecoverableError: (error) => console.error(error) });

      await expect.element(page.getByRole('img', { name: /^Chiffre d’affaires: up from 1 234,5/ })).toBeInTheDocument();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(hydrationErrors(errors)).toEqual([]);

      root.unmount();
      container.remove();
    });
  });
});
