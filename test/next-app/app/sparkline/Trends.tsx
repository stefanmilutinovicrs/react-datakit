'use client';

import { Sparkline } from 'react-datakit/sparkline';

const signups = [1200, 1850, 900, 2240, 3010.5, 2605, 1400];
const delta = [4, -2, null, 3, null, -5, 6];

export function Trends() {
  return (
    <div>
      <Sparkline data={signups} label="Inscriptions" locale="fr-FR" xScale="band" domain={{ max: 3500 }}>
        <Sparkline.ReferenceLine value={3500} />
        <Sparkline.Bars />
        <Sparkline.Marker at="max" />
      </Sparkline>
      <Sparkline
        data={delta.map((value, day) => ({ day, value }))}
        itemToValue={(item) => item.value}
        label="Variation nette"
        locale="fr-FR"
      >
        <Sparkline.ReferenceLine value={0} />
        <Sparkline.Area />
        <Sparkline.Line />
        <Sparkline.Marker at={3} />
        <Sparkline.Marker at="last" />
      </Sparkline>
      <p>
        18 240,5 <Sparkline data={signups} decorative />
      </p>
    </div>
  );
}
