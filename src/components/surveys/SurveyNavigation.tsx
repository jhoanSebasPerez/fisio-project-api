'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { BarChart3Icon, ClipboardCheckIcon } from 'lucide-react'

interface NavigationProps {
  className?: string
  activeItem?: string
}

export function SurveyNavigation({ className, activeItem }: NavigationProps) {
  const pathname = usePathname()

  const navItems = [
    {
      title: 'Listado de Encuestas',
      href: '/admin/surveys',
      icon: ClipboardCheckIcon,
      id: 'surveys',
      isActive: activeItem ? activeItem === 'surveys' : pathname === '/admin/surveys',
    },
    {
      title: 'Reportes',
      href: '/admin/reports/satisfaction',
      icon: BarChart3Icon,
      id: 'reports',
      isActive: activeItem ? activeItem === 'reports' : pathname === '/admin/reports/satisfaction',
    },
  ]

  return (
    <div className={cn('mb-6', className)}>
      <nav className="flex items-center space-x-4 lg:space-x-6 bg-muted/50 p-2 rounded-md">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 text-sm font-medium py-2 px-3 rounded-md transition-colors duration-200',
              item.isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        ))}
      </nav>
    </div>
  )
}
