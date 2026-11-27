import { Sparkline } from 'react-datakit/sparkline';
import { Trends } from './Trends';

const pages = [
  { name: 'Paiement', total: 18240.5, trend: [1210.5, 1480, 1395.25, 1720, 1650, 1905.75, 2240] },
  { name: 'Recherche', total: 9400, trend: [2050, 1840, 1920, 1515, 1400, 1210, 1105] },
  { name: 'Profil', total: 3100, trend: [520, 610, null, 700, null, 805, 790] },
];

// A server component that renders the Sparkline root itself, with the default Line: no dotted
// names and no function props cross into the client module. The locale is explicit because
// the server's default locale need not be the browser's, and the aria-label must match on both.
export default function SparklinePage() {
  return (
    <main data-dk-theme="light">
      <table>
        <caption>Erreurs par page</caption>
        <thead>
          <tr>
            <th>Page</th>
            <th>Total</th>
            <th>7 derniers jours</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td>{row.total}</td>
              <td>
                <Sparkline data={row.trend} label={`Erreurs ${row.name}`} locale="fr-FR" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Trends />
    </main>
  );
}
