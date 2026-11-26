export interface User {
  id: number;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
}

export const users: User[] = [
  { id: 1, name: 'Ana Petrović' },
  { id: 2, name: 'Bojan Jović' },
  { id: 3, name: 'Elena Kim' },
];

export const tags: Tag[] = ['frontend', 'backend', 'accessibility', 'design'].map((name) => ({ id: name, name }));
