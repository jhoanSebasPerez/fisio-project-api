'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldAlertIcon } from 'lucide-react'

interface AccessDeniedProps {
  message?: string
}

export default function AccessDenied({ message = 'No tiene permisos para acceder a esta página' }: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <ShieldAlertIcon className="h-16 w-16 text-red-500 mb-4" />
      <h1 className="text-2xl font-bold mb-4">Acceso denegado</h1>
      <p className="text-lg mb-8">{message}</p>
      <Button asChild>
        <Link href="/">
          Volver al inicio
        </Link>
      </Button>
    </div>
  )
}
