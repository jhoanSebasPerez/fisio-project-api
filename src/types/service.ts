export interface Service {
  id: string
  name: string
  description: string
  duration: number
  price: number
  imageUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ServiceFiltersType {
  name: string
  activeOnly: boolean
}

export interface CreateServiceFormData {
  name: string
  description: string
  duration: number
  price: number
  isActive?: boolean
}
