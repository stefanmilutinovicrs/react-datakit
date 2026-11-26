import type { ReactNode } from 'react';
import 'react-datakit/styles.css';
import './layout.css';

export const metadata = { title: 'react-datakit in the Next.js App Router' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
