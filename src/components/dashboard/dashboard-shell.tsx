import React from 'react';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  children?: React.ReactNode;
  className?: string;
}

export function DashboardShell({
  children,
  className,
  ...props
}: DashboardShellProps) {
  return (
    <div
      className={cn(
        'grid items-start gap-4 p-4 md:p-6 lg:p-8 rounded-lg border bg-white dark:bg-gray-950 shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
