'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StarIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

interface SummaryData {
  recentSurveys: {
    total: number
    averageSatisfaction: number
  }
  todaySurveys: {
    count: number
    averageSatisfaction: number
  }
}

export function SatisfactionSummary() {
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/dashboard/satisfaction-summary')
        
        if (!res.ok) {
          throw new Error(`Error al cargar datos: ${res.statusText}`)
        }
        
        const summaryData = await res.json()
        setData(summaryData)
        setError(null)
      } catch (err: any) {
        console.error('Error cargando resumen de satisfacción:', err)
        setError(err.message || 'Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }
    
    fetchSummary()
  }, [])
  
  // Renderizar estrellas
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon 
            key={star}
            className={`h-4 w-4 ${
              star <= Math.round(rating) 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-gray-300'
            }`} 
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-36 mb-2" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card className="border-red-100">
        <CardHeader className="pb-2">
          <CardTitle>Satisfacción del paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    )
  }
  
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Satisfacción del paciente</CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Sin datos de encuestas</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Satisfacción del paciente</CardTitle>
        <CardDescription>Resumen de encuestas recientes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hoy</p>
              <div className="flex items-center gap-2">
                {data.todaySurveys.count > 0 ? (
                  <>
                    <p className="text-2xl font-bold">
                      {data.todaySurveys.averageSatisfaction.toFixed(1)}
                    </p>
                    {renderStars(data.todaySurveys.averageSatisfaction)}
                  </>
                ) : (
                  <p className="text-sm">Sin encuestas hoy</p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {data.todaySurveys.count} {data.todaySurveys.count === 1 ? 'encuesta' : 'encuestas'}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground">Últimos 30 días</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {data.recentSurveys.averageSatisfaction.toFixed(1)}
                </p>
                {renderStars(data.recentSurveys.averageSatisfaction)}
              </div>
              <p className="text-sm text-muted-foreground">
                {data.recentSurveys.total} {data.recentSurveys.total === 1 ? 'encuesta' : 'encuestas'}
              </p>
            </div>
          </div>
          
          <div className="flex justify-between">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/surveys">
                Ver todas las encuestas
              </Link>
            </Button>
            
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/reports/satisfaction">
                Ver reportes
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
