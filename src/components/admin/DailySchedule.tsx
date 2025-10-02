import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { add, format, startOfDay, endOfDay, set } from 'date-fns';
import { ptBR } from 'date-fns/locale'; // Corrigido: removido o '='
import { Clock, User, Scissors, Lock, Unlock } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

interface Slot {
  time: Date;
  status: 'available' | 'booked' | 'blocked';
  details?: {
    id: string;
    client_name?: string;
    service_name?: string;
  };
}

interface DailyScheduleProps {
  selectedDate: Date | undefined;
}

const DailySchedule = ({ selectedDate }: DailyScheduleProps) => {
  const { currentUser } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedule = useCallback(async () => {
    if (!currentUser || !selectedDate) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const start = startOfDay(selectedDate).toISOString();
    const end = endOfDay(selectedDate).toISOString();

    // Buscar disponibilidade diária diretamente com .single()
    const { data: availability, error: availabilityError } = await supabase
      .from('barber_availability')
      .select('start_time, end_time')
      .eq('barber_id', currentUser.id)
      .eq('date', dateStr)
      .single();

    // Se não houver disponibilidade diária definida para a data, mostre um erro e pare.
    if (availabilityError || !availability) {
      // MENSAGEM DE ERRO MAIS DETALHADA
      showError(`Disponibilidade diária não definida para ${dateStr} (Barbeiro ID: ${currentUser.id}). Por favor, defina em "Gerenciar Disponibilidade".`);
      setSlots([]);
      setLoading(false);
      return;
    }

    // Buscar agendamentos e horários bloqueados apenas se a disponibilidade diária for encontrada
    const [appointmentsRes, blockedSlotsRes] = await Promise.all([
      supabase.from('appointments').select('id, appointment_time, client_name, client_phone, profiles(full_name), services(name)').eq('barber_id', currentUser.id).gte('appointment_time', start).lte('appointment_time', end),
      supabase.from('blocked_slots').select('id, start_time').eq('barber_id', currentUser.id).gte('start_time', start).lte('start_time', end)
    ]);

    const { data: appointments } = appointmentsRes;
    const { data: blockedSlots } = blockedSlotsRes;

    const toLocalTimeForComparison = (utcIsoString: string, targetDate: Date) => {
      const utcDate = new Date(utcIsoString);
      return set(startOfDay(targetDate), {
        hours: utcDate.getHours(),
        minutes: utcDate.getMinutes(),
        seconds: 0,
        milliseconds: 0
      });
    };

    const bookedTimes = appointments?.map(a => ({
      time: toLocalTimeForComparison(a.appointment_time, selectedDate).getTime(),
      details: {
        id: a.id,
        client_name: (a.profiles as any)?.full_name || a.client_name || 'Nome Indisponível',
        service_name: (a.services as any)?.name || 'Serviço Indisponível'
      }
    })) || [];

    const blockedTimes = blockedSlots?.map(b => ({
      time: toLocalTimeForComparison(b.start_time, selectedDate).getTime(),
      details: { id: b.id }
    })) || [];
    
    const allSlots: Slot[] = [];
    const slotDuration = 45;
    
    let currentTime = new Date(`${dateStr}T${availability.start_time}`);
    currentTime = set(currentTime, { milliseconds: 0 });
    
    const endTime = new Date(`${dateStr}T${availability.end_time}`);
    const normalizedEndTime = set(endTime, { milliseconds: 0 });

    while (currentTime < normalizedEndTime) {
      const currentSlotTime = currentTime.getTime();
      const bookedSlot = bookedTimes.find(b => b.time === currentSlotTime);
      const blockedSlot = blockedTimes.find(b => b.time === currentSlotTime);

      if (bookedSlot) {
        allSlots.push({ time: new Date(currentTime), status: 'booked', details: bookedSlot.details });
      } else if (blockedSlot) {
        allSlots.push({ time: new Date(currentTime), status: 'blocked', details: blockedSlot.details });
      }
      currentTime = add(currentTime, { minutes: slotDuration });
      currentTime = set(currentTime, { milliseconds: 0 });
    }

    setSlots(allSlots);
    setLoading(false);
  }, [selectedDate, currentUser]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleBlock = async (time: Date) => {
    if (!currentUser) return;
    const { error } = await supabase.from('blocked_slots').insert({
      barber_id: currentUser.id,
      start_time: time.toISOString(),
      end_time: add(time, { minutes: 45 }).toISOString(),
    });
    if (error) showError('Erro ao bloquear horário.');
    else {
      showSuccess('Horário bloqueado.');
      fetchSchedule();
    }
  };

  const handleUnblock = async (slotId: string) => {
    const { error } = await supabase.from('blocked_slots').delete().eq('id', slotId);
    if (error) showError('Erro ao desbloquear horário.');
    else {
      showSuccess('Horário desbloqueado.');
      fetchSchedule();
    }
  };

  const formattedDate = selectedDate ? format(selectedDate, "eeee, dd 'de' MMMM", { locale: ptBR }) : 'Nenhuma data selecionada';

  const renderSlot = (slot: Slot) => {
    switch (slot.status) {
      case 'booked':
        return (
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4" /><span>{slot.details?.client_name || 'Nome Indisponível'}</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><Scissors className="h-4 w-4" /><span>{slot.details?.service_name || 'Serviço Indisponível'}</span></div>
          </div>
        );
      case 'blocked':
        return <div className="flex-1 flex items-center gap-2 text-destructive"><Lock className="h-4 w-4" /><span>Horário Bloqueado</span></div>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agenda para {formattedDate}</CardTitle>
        <CardDescription>Gerencie seus horários para o dia selecionado.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-40 w-full" /> : slots.length > 0 ? (
          <div className="space-y-2">
            {slots.map((slot) => (
              <div key={slot.time.toISOString()} className="p-3 border rounded-lg bg-card flex items-center gap-4">
                <div className="flex items-center gap-2 w-24">
                  <Clock className="h-5 w-5 text-primary" />
                  <p className="text-lg font-bold">{format(slot.time, 'HH:mm')}</p>
                </div>
                {renderSlot(slot)}
                {slot.status === 'blocked' && <Button variant="secondary" size="sm" onClick={() => handleUnblock(slot.details!.id)}><Unlock className="mr-2 h-4 w-4" />Desbloquear</Button>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Nenhum agendamento ou horário bloqueado para esta data.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default DailySchedule;