'use client'

import { useState } from 'react'
import { ServiceList } from '@/components/dashboard/services/ServiceList'
import { CreateServiceForm } from '@/components/dashboard/services/CreateServiceForm'
import { ServiceFilters } from '@/components/dashboard/services/ServiceFilters'
import { Service } from '@/types/service'
import { useToast } from '@/components/ui/use-toast'
import { Plus } from 'lucide-react'

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    name: '',
    activeOnly: true
  })
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { toast } = useToast()

  const applyFilters = (newFilters: { name: string; activeOnly: boolean }) => {
    setFilters(newFilters)
  }

  const handleServiceCreated = (newService: Service) => {
    setServices(prevServices => [newService, ...prevServices])
    toast({
      title: "Servicio creado",
      description: `El servicio ${newService.name} ha sido creado correctamente.`,
    })
  }

  const handleServiceUpdated = (updatedService: Service) => {
    setServices(prevServices =>
      prevServices.map(service =>
        service.id === updatedService.id ? updatedService : service
      )
    )
    toast({
      title: "Servicio actualizado",
      description: `El servicio ${updatedService.name} ha sido actualizado.`,
    })
  }

  const handleServiceDeleted = (serviceId: string, serviceName: string) => {
    setServices(prevServices =>
      prevServices.filter(service => service.id !== serviceId)
    )
    toast({
      title: "Servicio eliminado",
      description: `El servicio ${serviceName} ha sido eliminado.`,
    })
  }

  const handleStatusToggle = (serviceId: string, isActive: boolean, serviceName: string) => {
    setServices(prevServices =>
      prevServices.map(service =>
        service.id === serviceId ? { ...service, isActive } : service
      )
    )
    toast({
      title: isActive ? "Servicio activado" : "Servicio desactivado",
      description: `El servicio ${serviceName} ha sido ${isActive ? 'activado' : 'desactivado'}.`,
    })
  }

  return (
    <div className="flex flex-col space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Servicios</h2>
          <p className="text-muted-foreground">
            Gestiona los servicios ofrecidos en la clínica
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus size={16} /> Nuevo Servicio
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <ServiceFilters
          filters={filters}
          onApplyFilters={applyFilters}
        />
        <ServiceList
          services={services}
          setServices={setServices}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          filters={filters}
          onStatusToggle={handleStatusToggle}
          onServiceDeleted={handleServiceDeleted}
          onServiceUpdated={handleServiceUpdated}
        />
      </div>

      {/* Modal para crear nuevo servicio */}
      {isCreateModalOpen && (
        <CreateServiceForm
          onServiceCreated={handleServiceCreated}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  )
}
