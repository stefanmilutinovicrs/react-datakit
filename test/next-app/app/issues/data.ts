import type { IssueFilter } from './fields';

export interface Issue {
  id: number;
  title: string;
  status: string;
  owner: string;
  estimate: number;
  created: string;
}

export const issues: Issue[] = [
  { id: 1, title: 'Checkout fails', status: 'open', owner: 'ana', estimate: 3, created: '2026-03-02' },
  { id: 2, title: 'Dark mode', status: 'done', owner: 'bojan', estimate: 5, created: '2026-03-10' },
  { id: 3, title: 'Slow search', status: 'open', owner: 'bojan', estimate: 8, created: '2026-04-01' },
];

// Just enough of a query for the operators the e2e test uses.
function matches(issue: Issue, filter: IssueFilter): boolean {
  switch (filter.field) {
    case 'title':
      return filter.op === 'contains' ? issue.title.toLowerCase().includes(filter.value.toLowerCase()) : true;
    case 'status':
      return filter.op === 'is' ? issue.status === filter.value : issue.status !== filter.value;
    case 'owner':
      return filter.op === 'isNoneOf' ? !filter.value.includes(issue.owner) : filter.value.includes(issue.owner);
    case 'estimate':
      if (filter.op === 'between') return issue.estimate >= filter.value[0] && issue.estimate <= filter.value[1];
      return filter.op === 'gt' ? issue.estimate > filter.value : issue.estimate === filter.value;
    case 'created': {
      const inside = issue.created >= filter.value.start && issue.created <= filter.value.end;
      return filter.op === 'between' ? inside : !inside;
    }
  }
}

export function findIssues(filters: readonly IssueFilter[]): Issue[] {
  return issues.filter((issue) => filters.every((filter) => matches(issue, filter)));
}
