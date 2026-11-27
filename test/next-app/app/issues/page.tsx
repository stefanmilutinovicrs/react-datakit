import { Suspense } from 'react';
import { filtersFromSearchParams } from 'react-datakit/filterbar/schema';
import { findIssues } from './data';
import { fields } from './fields';
import { IssueFilters } from './IssueFilters';

// A server component: it parses searchParams with the schema entry, which has no "use client",
// and queries with the result. The bar itself is a client component.
export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { filters, errors } = filtersFromSearchParams(await searchParams, fields);
  const found = findIssues(filters);
  return (
    <main data-dk-theme="light">
      <Suspense>
        <IssueFilters />
      </Suspense>
      <p data-testid="errors">Left out: {errors.length}</p>
      <ul aria-label="Issues">
        {found.map((issue) => (
          <li key={issue.id}>{issue.title}</li>
        ))}
      </ul>
    </main>
  );
}
