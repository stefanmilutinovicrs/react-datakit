'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { FilterBar } from 'react-datakit/filterbar';
import { filtersFromSearchParams, filtersToSearchParams } from 'react-datakit/filterbar/schema';
import { fields } from './fields';

export function IssueFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const value = useMemo(() => filtersFromSearchParams(params, fields).filters, [params]);
  return (
    <FilterBar
      fields={fields}
      locale="en-US"
      value={value}
      onChange={(next) => {
        router.push(`${pathname}?${filtersToSearchParams(next, fields, params).toString()}`);
      }}
    />
  );
}
