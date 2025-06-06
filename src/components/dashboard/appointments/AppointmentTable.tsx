'use client';

import { useState } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  ChevronUp,
  ChevronDown,
  Eye,
  Check,
  X,
  Clock,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AppointmentTableProps {
  appointments: any[];
  loading: boolean;
  onViewDetails: (appointment: any) => void;
  onStatusChange: (appointmentId: string, newStatus: string) => void;
}

export function AppointmentTable({
  appointments,
  loading,
  onViewDetails,
  onStatusChange
}: AppointmentTableProps) {
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Ordenar citas
  const sortedAppointments = [...appointments].sort((a, b) => {
    let valueA, valueB;

    switch (sortField) {
      case 'date':
        valueA = new Date(a.date).getTime();
        valueB = new Date(b.date).getTime();
        break;
      case 'patientName':
        valueA = a.patient.name.toLowerCase();
        valueB = b.patient.name.toLowerCase();
        break;
      case 'therapistName':
        valueA = (a.therapist?.name || '').toLowerCase();
        valueB = (b.therapist?.name || '').toLowerCase();
        break;
      case 'status':
        valueA = a.status;
        valueB = b.status;
        break;
      default:
        valueA = a[sortField];
        valueB = b[sortField];
    }

    if (sortDirection === 'asc') {
      return valueA > valueB ? 1 : -1;
    } else {
      return valueA < valueB ? 1 : -1;
    }
  });

  // Obtener color para el estado
  const getStatusColorClasses = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-700 border border-blue-300';
      case 'SCHEDULED':
        return 'bg-purple-100 text-purple-700 border border-purple-300';
      case 'RESCHEDULED':
        return 'bg-amber-100 text-amber-700 border border-amber-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 border border-red-300';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 border border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-300';
    }
  };

  // Obtener color para el punto indicador
  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-600';
      case 'SCHEDULED':
        return 'bg-purple-600';
      case 'RESCHEDULED':
        return 'bg-amber-600';
      case 'CANCELLED':
        return 'bg-red-600';
      case 'COMPLETED':
        return 'bg-green-600';
      default:
        return 'bg-gray-600';
    }
  };

  // Traducir estado a español
  const translateStatus = (status: string) => {
    const translations: Record<string, string> = {
      'SCHEDULED': 'Agendada',
      'CONFIRMED': 'Confirmada',
      'RESCHEDULED': 'Reprogramada',
      'CANCELLED': 'Cancelada',
      'COMPLETED': 'Completada'
    };
    return translations[status] || status;
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd MMM yyyy - HH:mm", { locale: es });
    } catch (e) {
      return "Fecha inválida";
    }
  };

  // Renderizar botón de ordenamiento
  const renderSortButton = (field: string, label: string) => (
    <button
      className="flex items-center space-x-1 focus:outline-none"
      onClick={() => handleSort(field)}
    >
      <span>{label}</span>
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )
      ) : (
        <div className="w-4" />
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No se encontraron citas que coincidan con los filtros</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-md mt-4">
      <Table className="w-full border-collapse bg-white text-left text-sm text-gray-700">
        <TableHeader>
          <TableRow className="bg-slate-200">
            <TableHead className="px-6 py-4 font-medium text-slate-700">{renderSortButton('date', 'Fecha y Hora')}</TableHead>
            <TableHead className="px-6 py-4 font-medium text-slate-700">{renderSortButton('patientName', 'Paciente')}</TableHead>
            <TableHead className="px-6 py-4 font-medium text-slate-700">{renderSortButton('therapistName', 'Fisioterapeuta')}</TableHead>
            <TableHead className="px-6 py-4 font-medium text-slate-700">Servicios</TableHead>
            <TableHead className="px-6 py-4 font-medium text-slate-700">{renderSortButton('status', 'Estado')}</TableHead>
            <TableHead className="px-6 py-4 font-medium text-slate-700 text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-200 border-t">
          {sortedAppointments.map((appointment) => (
            <TableRow key={appointment.id} className="hover:bg-slate-50">
              <TableCell className="px-6 py-4 font-medium">
                {formatDate(appointment.date)}
              </TableCell>
              <TableCell className="px-6 py-4">
                {appointment.patient.name}
                <div className="text-xs text-gray-500">
                  {appointment.patient.email}
                </div>
              </TableCell>
              <TableCell className="px-6 py-4">
                {appointment.therapist ? (
                  <>
                    {appointment.therapist.name}
                    <div className="text-xs text-gray-500">
                      {appointment.therapist.email}
                    </div>
                  </>
                ) : (
                  <span className="text-gray-500 italic">Sin asignar</span>
                )}
              </TableCell>
              <TableCell className="px-6 py-4">
                <div className="max-w-[200px] flex flex-wrap gap-1">
                  {appointment.appointmentServices.map((as: any) => (
                    <span key={as.id} className="inline-block bg-slate-200 px-2 py-1 text-xs rounded">
                      {as.service.name}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${getStatusColorClasses(appointment.status)}`}>
                  <span className={`h-2 w-2 rounded-full ${getStatusDotColor(appointment.status)}`}></span>
                  {translateStatus(appointment.status)}
                </span>
              </TableCell>
              <TableCell className="px-6 py-4">
                <div className="flex gap-4 justify-center items-center">
                  <button
                    onClick={() => onViewDetails(appointment)}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors rounded-md font-medium text-xs"
                    title="Ver detalles"
                  >
                    <Eye size={14} />
                    <span>Ver</span>
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors rounded-md font-medium text-xs">
                        <RefreshCw size={14} />
                        <span>Cambiar estado</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onStatusChange(appointment.id, 'SCHEDULED')}
                        disabled={appointment.status === 'SCHEDULED'}
                        className="flex items-center gap-2"
                      >
                        <Clock className="h-4 w-4" />
                        Agendada
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange(appointment.id, 'CONFIRMED')}
                        disabled={appointment.status === 'CONFIRMED'}
                        className="flex items-center gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Confirmada
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange(appointment.id, 'RESCHEDULED')}
                        disabled={appointment.status === 'RESCHEDULED'}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reprogramada
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange(appointment.id, 'CANCELLED')}
                        disabled={appointment.status === 'CANCELLED'}
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Cancelada
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange(appointment.id, 'COMPLETED')}
                        disabled={appointment.status === 'COMPLETED'}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Completada
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
