import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactNode } from 'react';
import { Sparkline } from './index';

const revenue = [42, 45, 41, 48, 52, 49, 55, 61, 58, 54, 60, 66, 63, 70, 68, 74, 71, 69, 77, 82];
const delta = [4, 2, -1, -5, -3, 1, 6, 3, -2, -6, -4, 2, 5, 7, 3];
const visits = [31, 34, 29, 38, 45, 52, 48, 57, 63, 55, 49, 44, 41, 47, 50, 46, 43, 48, 52, 49];
const signups = [12, 18, 9, 22, 30, 26, 14, 19, 24, 31, 28, 17];
const large: CSSProperties = { width: 240, height: 48 };

function Example({ title, children }: { title: string; children: ReactNode }) {
  return (
    <figure style={{ margin: 0, display: 'grid', gap: 6 }}>
      <figcaption style={{ fontSize: 13 }}>{title}</figcaption>
      {children}
    </figure>
  );
}

function Gallery({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
      {children}
    </div>
  );
}

const meta = {
  title: 'Components/Sparkline',
  tags: ['experimental'],
  parameters: {
    docs: {
      description: {
        component:
          'A small chart in SVG, without axes, that renders the same on the server and in the browser. It is an image whose accessible name is the label and a summary (trend, low, high, last value), or `decorative` when the number next to it says enough. The viewBox stretches to the CSS size; strokes and markers keep their width.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => <Sparkline data={revenue} label="Revenue, last 20 days" locale="en-US" />,
};

export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Line (the default), area, and bars. Bars need `xScale="band"`, which puts each value in its own slot and starts the axis at zero.',
      },
    },
  },
  render: () => (
    <Gallery>
      <Example title="Line">
        <Sparkline data={revenue} label="Revenue" locale="en-US" style={large} />
      </Example>
      <Example title="Area and line">
        <Sparkline data={revenue} label="Revenue" locale="en-US" style={large}>
          <Sparkline.Area />
          <Sparkline.Line />
        </Sparkline>
      </Example>
      <Example title="Bars">
        <Sparkline data={signups} label="Sign-ups per month" locale="en-US" xScale="band" style={large}>
          <Sparkline.Bars />
        </Sparkline>
      </Example>
      <Example title="Negative values, bars from zero">
        <Sparkline data={delta} label="Net change" locale="en-US" xScale="band" style={large}>
          <Sparkline.Bars />
        </Sparkline>
      </Example>
    </Gallery>
  ),
};

export const MarkersAndReferenceLine: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Markers on the low, the high and the last value, and reference lines for a target and for zero. A reference line outside the y axis is not drawn and warns in development; `domain` brings it onto the axis.',
      },
    },
  },
  render: () => (
    <Gallery>
      <Example title="Low, high and last">
        <Sparkline data={visits} label="Visits" locale="en-US" style={large}>
          <Sparkline.Line />
          <Sparkline.Marker at="min" />
          <Sparkline.Marker at="max" />
          <Sparkline.Marker at="last" />
        </Sparkline>
      </Example>
      <Example title="Target of 90, included with domain">
        <Sparkline data={revenue} label="Revenue" locale="en-US" domain={{ max: 90 }} style={large}>
          <Sparkline.ReferenceLine value={90} />
          <Sparkline.Area />
          <Sparkline.Line />
          <Sparkline.Marker at="last" />
        </Sparkline>
      </Example>
      <Example title="Zero line">
        <Sparkline data={delta} label="Net change" locale="en-US" style={large}>
          <Sparkline.ReferenceLine value={0} />
          <Sparkline.Line />
        </Sparkline>
      </Example>
    </Gallery>
  ),
};

export const EdgeCases: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Gaps (`null`, `undefined`, `NaN`) split the line. A value with gaps on both sides is drawn as a dot only as wide as the line, so mark it with `<Sparkline.Marker at={index} />`; a single value is a dot in the middle, marked here with `at="last"`. Without values the SVG is empty and named "no data".',
      },
    },
  },
  render: () => (
    <Gallery>
      <Example title="No values">
        <Sparkline data={[]} label="Revenue" style={large} />
      </Example>
      <Example title="A single value, with a marker">
        <Sparkline data={[42]} label="Revenue" locale="en-US" style={large}>
          <Sparkline.Line />
          <Sparkline.Marker at="last" />
        </Sparkline>
      </Example>
      <Example title="All values equal">
        <Sparkline data={[5, 5, 5, 5, 5]} label="Seats" locale="en-US" style={large} />
      </Example>
      <Example title="Negative values">
        <Sparkline data={[-3, -8, -5, -12, -9, -4]} label="Balance" locale="en-US" style={large}>
          <Sparkline.Area />
          <Sparkline.Line />
        </Sparkline>
      </Example>
      <Example title="Gaps, and a value isolated between two gaps">
        <Sparkline data={[8, 11, 9, null, 14, null, 12, 15, 13]} label="Uptime checks" locale="en-US" style={large}>
          <Sparkline.Line />
          <Sparkline.Marker at={4} />
        </Sparkline>
      </Example>
    </Gallery>
  ),
};

const rows = [
  { name: 'Checkout', total: 1820, trend: [12, 14, 13, 17, 16, 19, 22] },
  { name: 'Search', total: 940, trend: [20, 18, 19, 15, 14, 12, 11] },
  { name: 'Profile', total: 310, trend: [5, 6, 5, null, 7, 8, 8] },
];

export const InATable: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'In the first table the sparkline is decorative, since the number beside it is what a screen reader needs. In the second it carries the trend, so it is an image with a summary.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'grid', gap: 24, justifyItems: 'start' }}>
      {[true, false].map((decorative) => (
        <table key={String(decorative)} style={{ borderCollapse: 'collapse' }}>
          <caption style={{ textAlign: 'start', paddingBlockEnd: 8 }}>
            {decorative ? 'Errors this week (decorative trend)' : 'Errors this week (trend as an image)'}
          </caption>
          <thead>
            <tr>
              <th style={{ textAlign: 'start', paddingInlineEnd: 24 }}>Page</th>
              <th style={{ textAlign: 'end', paddingInlineEnd: 24 }}>Total</th>
              <th style={{ textAlign: 'start' }}>Last 7 days</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td style={{ paddingInlineEnd: 24 }}>{row.name}</td>
                <td style={{ textAlign: 'end', paddingInlineEnd: 24 }}>{row.total.toLocaleString('en-US')}</td>
                <td>
                  {decorative ? (
                    <Sparkline data={row.trend} decorative />
                  ) : (
                    <Sparkline data={row.trend} label={`${row.name} errors`} locale="en-US" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  ),
};

const customTheme = { '--dk-accent': '#c2410c' } as CSSProperties;

export const Themed: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The color is `currentColor`, which the theme sets to the accent: a `data-dk-accent` preset, `--dk-accent`, or `color` on the sparkline itself.',
      },
    },
  },
  render: () => (
    <Gallery>
      {(['indigo', 'teal', 'violet', 'blue'] as const).map((accent) => (
        <div key={accent} data-dk-accent={accent}>
          <Example title={`data-dk-accent="${accent}"`}>
            <Sparkline data={revenue} label="Revenue" locale="en-US" style={large}>
              <Sparkline.Area />
              <Sparkline.Line />
              <Sparkline.Marker at="last" />
            </Sparkline>
          </Example>
        </div>
      ))}
      <div style={customTheme}>
        <Example title="--dk-accent: #c2410c">
          <Sparkline data={signups} label="Sign-ups" locale="en-US" xScale="band" style={large}>
            <Sparkline.Bars />
          </Sparkline>
        </Example>
      </div>
    </Gallery>
  ),
};
