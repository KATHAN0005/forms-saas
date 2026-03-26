import { useEffect } from 'react';
import { Navbar } from './Navbar';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function PageLayout({ children, title }: PageLayoutProps) {
  useEffect(() => {
    if (title) {
      document.title = `${title} — FormSaaS`;
    }
  }, [title]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
