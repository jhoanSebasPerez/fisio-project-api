'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Users,
  User,
  FileText,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  MessageSquare,
  Stethoscope,
  ClipboardList,
  Clock
} from 'lucide-react';

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export function Sidebar({ isSidebarOpen, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  // Evitar errores de hidratación
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determinar qué enlaces mostrar según el rol
  const isAdmin = session?.user?.role === 'ADMIN';
  const isTherapist = session?.user?.role === 'THERAPIST';

  // Definir los enlaces de navegación según el rol
  const navigationLinks = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["ADMIN", "THERAPIST"],
    },
    {
      name: "Citas",
      href: "/dashboard/appointments",
      icon: Calendar,
      roles: ["ADMIN", "THERAPIST"],
    },
    {
      name: "Pacientes",
      href: "/dashboard/patients",
      icon: Users,
      roles: ["ADMIN", "THERAPIST"],
    },
    {
      name: "Fisioterapeutas",
      href: "/dashboard/therapists",
      icon: Stethoscope,
      roles: ["ADMIN"],
    },
    {
      name: "Servicios",
      href: "/dashboard/services",
      icon: ClipboardList,
      roles: ["ADMIN"],
    },
    {
      name: "Horarios",
      href: "/dashboard/schedules",
      icon: Clock,
      roles: ["ADMIN", "THERAPIST"],
    },
    {
      name: "Reportes",
      href: "/dashboard/reports",
      icon: FileText,
      roles: ["ADMIN"],
    },
  ];

  if (!mounted) {
    return null;
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-16 bottom-0 left-0 z-50 flex flex-col w-60 h-[calc(100vh-4rem)] border-r border-gray-200 bg-white transition-transform duration-300",
          isSidebarOpen ? "transform-none" : "-translate-x-full md:transform-none",
          !isSidebarOpen && "md:w-20"
        )}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Toggle collapse button - only visible on desktop */}
          <div className="hidden md:flex justify-end p-2">
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label={isSidebarOpen ? "Colapsar menú" : "Expandir menú"}
            >
              {isSidebarOpen ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-2 py-4">
            <ul className="space-y-1">
              {navigationLinks.map((item) => {
                // Mostrar el enlace solo si el usuario tiene el rol adecuado
                if (!session?.user?.role || !item.roles.includes(session.user.role)) {
                  return null;
                }

                // Lógica mejorada para determinar si un ítem está activo
                // Para /dashboard solo es activo si es exactamente /dashboard
                // Para otras rutas, pueden ser activas si la ruta actual empieza con ellas
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center px-3 py-2 rounded-md transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-gray-100 text-gray-700 hover:text-gray-900",
                        !isSidebarOpen && "md:justify-center"
                      )}
                    >
                      <item.icon size={20} className={cn("flex-shrink-0", !isSidebarOpen && "md:w-6 md:h-6")} />
                      {(isSidebarOpen || window.innerWidth < 768) && (
                        <span className="ml-3 text-sm font-medium">{item.name}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Footer information - only visible when expanded */}
        {isSidebarOpen && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-center">
              <div className="text-xs text-center text-gray-500">
                <p>Clínica de Fisioterapia</p>
                <p>v1.0.0</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
