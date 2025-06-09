'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StarIcon } from 'lucide-react'

interface SurveyResponseProps {
  appointmentId: string
  showTitle?: boolean
}

interface SurveyResponseData {
  id: string
  satisfaction: number
  comments: string
  createdAt: string
  appointmentId: string
  patientId: string
}

export function SurveyResponseView({ appointmentId, showTitle = true }: SurveyResponseProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<SurveyResponseData | null>(null)

  useEffect(() => {
    const fetchSurveyResponse = async () => {
      if (!appointmentId) {
        setLoading(false)
        return
      }

      setLoading(true)
      
      try {
        const res = await fetch(`/api/survey/${appointmentId}`)
        
        if (res.status === 404) {
          setResponse(null)
          setError(null)
          setLoading(false)
          return
        }
        
        if (!res.ok) {
          throw new Error(`Error al cargar encuesta: ${res.statusText}`)
        }
        
        const data = await res.json()
        setResponse(data)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Error al cargar los datos de la encuesta')
        console.error('Error al cargar encuesta:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSurveyResponse()
  }, [appointmentId])

  // Renderizar estrellas según calificación
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {Array(5).fill(0).map((_, i) => (
          <StarIcon
            key={i}
            className={`h-5 w-5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-[250px] mb-2" />
          <Skeleton className="h-4 w-[200px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">Error al cargar encuesta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!response) {
    return (
      <Card className="border-dashed border-gray-300 bg-gray-50">
        <CardHeader>
          <CardTitle className="text-gray-500">Sin encuesta</CardTitle>
          <CardDescription>
            El paciente aún no ha completado la encuesta de satisfacción
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Encuesta de Satisfacción</CardTitle>
              <CardDescription>
                Completada el {new Date(response.createdAt).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-green-50">
              Completada
            </Badge>
          </div>
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1 text-gray-500">
              Calificación general
            </p>
            <div className="flex items-center gap-2">
              {renderStars(response.satisfaction)}
              <span className="font-bold text-lg">{response.satisfaction}/5</span>
            </div>
          </div>

          {response.comments && (
            <div>
              <p className="text-sm font-medium mb-1 text-gray-500">
                Comentarios
              </p>
              <div className="bg-gray-50 p-3 rounded-md text-gray-700">
                {response.comments}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
