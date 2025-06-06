'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  Bell,
  User,
  LogOut,
  Settings,
  UserCircle,
  Menu as MenuIcon,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function Header({ toggleSidebar, isSidebarOpen }: HeaderProps) {
  const { data: session } = useSession();
  const [showNotifications, setShowNotifications] = useState(false);

  // Función para mostrar el rol en español
  const getRoleInSpanish = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrador';
      case 'THERAPIST':
        return 'Fisioterapeuta';
      case 'PATIENT':
        return 'Paciente';
      default:
        return 'Usuario';
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Hamburger Menu and Logo */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 md:hidden"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? <X size={20} /> : <MenuIcon size={20} />}
          </Button>
          <div className="hidden md:flex md:items-center">
            <span className="text-xl font-bold text-primary">Clínica de Fisioterapia</span>
          </div>
        </div>

        {/* Center - Responsive Title */}
        <div className="md:hidden flex items-center justify-center">
          <span className="text-lg font-semibold text-primary">Clínica de Fisioterapia</span>
        </div>

        {/* User info, notifications and user menu */}
        <div className="flex items-center space-x-4">
          {/* User role badge */}
          {session?.user?.role && (
            <div className="hidden md:block">
              <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                {getRoleInSpanish(session.user.role)}
              </span>
            </div>
          )}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Notifications"
              >
                <Bell size={20} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-4">
                <h3 className="font-medium">Notificaciones</h3>
                <DropdownMenuSeparator />
                <div className="py-2">
                  <div className="flex items-start gap-4 py-2">
                    <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full" />
                    <div>
                      <p className="text-sm font-medium">Nueva cita agendada</p>
                      <p className="text-xs text-gray-500">Hace 5 minutos</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 py-2">
                    <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full" />
                    <div>
                      <p className="text-sm font-medium">Recordatorio: Cita con María López</p>
                      <p className="text-xs text-gray-500">Hoy a las 15:00</p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-2" size="sm">
                  Ver todas las notificaciones
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="User menu"
              >
                <User size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="flex items-center gap-2 p-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                  <UserCircle size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium">{session?.user?.name || 'Usuario'}</p>
                  <p className="text-xs text-muted-foreground">{session?.user?.email || 'usuario@example.com'}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="flex items-center cursor-pointer">
                  <UserCircle className="w-4 h-4 mr-2" /> Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" /> Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center cursor-pointer text-red-600"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
