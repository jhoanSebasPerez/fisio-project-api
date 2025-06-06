'use client';

import { useState, useEffect } from 'react';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader } from 'lucide-react';

interface Therapist {
  id: string;
  name: string;
  email: string;
}

interface TherapistSelectorProps {
  currentTherapistId?: string;
  onSelect: (therapistId: string) => void;
  disabled?: boolean;
}

export function TherapistSelector({ 
  currentTherapistId, 
  onSelect, 
  disabled = false 
}: TherapistSelectorProps) {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTherapists = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/therapists?role=THERAPIST&active=true');
        
        if (!response.ok) {
          throw new Error('Error al cargar fisioterapeutas');
        }
        
        const data = await response.json();
        setTherapists(data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching therapists:', err);
        setError('No se pudieron cargar los fisioterapeutas');
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los fisioterapeutas',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTherapists();
  }, [toast]);

  // Manejar cambio de selección
  const handleSelectionChange = (value: string) => {
    onSelect(value);
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Loader className="h-4 w-4 animate-spin" />
        <span>Cargando fisioterapeutas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500">
        {error}
      </div>
    );
  }

  return (
    <Select
      defaultValue={currentTherapistId}
      onValueChange={handleSelectionChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Seleccionar fisioterapeuta" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fisioterapeutas</SelectLabel>
          {therapists.map((therapist) => (
            <SelectItem key={therapist.id} value={therapist.id}>
              {therapist.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
