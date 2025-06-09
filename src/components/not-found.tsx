'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface NotFoundProps {
  message?: string
}

export default function NotFound({ message = 'Página no encontrada' }: NotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-xl mb-8">{message}</p>
      <Button asChild>
        <Link href="/">
          Volver al inicio
        </Link>
      </Button>
    </div>
  )
}
