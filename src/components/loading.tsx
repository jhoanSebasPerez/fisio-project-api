'use client'

import { Loader2Icon } from 'lucide-react'

interface LoadingProps {
  message?: string
  className?: string
}

export default function Loading({ message = 'Cargando...', className = '' }: LoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      <Loader2Icon className="h-10 w-10 text-primary animate-spin mb-4" />
      <p className="text-lg text-gray-600">{message}</p>
    </div>
  )
}
