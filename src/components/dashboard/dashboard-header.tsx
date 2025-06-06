import React from 'react';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  heading: string;
  text?: string;
  children?: React.ReactNode;
  className?: string;
}

export function DashboardHeader({
  heading,
  text,
  children,
  className,
  ...props
}: DashboardHeaderProps) {
  return (
    <div className={cn('flex flex-col items-start gap-2', className)} {...props}>
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        {text && <p className="text-gray-500 dark:text-gray-400">{text}</p>}
      </div>
      {children}
    </div>
  );
}
