import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { add, format, startOfDay, set } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lock, Unlock, CalendarCheck } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

interface Slot {
  time: Date;
  status: 'available' | 'booked' | 'blocked';
  blockedId?: string; // ID do slot bloqueado, se houver
  bookedId?: string; // ID do agendamento, se houver
}

interface AvailabilitySlotsManagerProps {
  barberId: string;
  selectedDate: Date;
  dailyStartTime: string; // Ex: "09:00"
  dailyEndTime: string;   // Ex: "18:00"
  onSlotChange?: () => void; // Callback opcional para notificar o componente pai sobre mudanças
}

const AvailabilitySlotsManager = ({
  barberId,
  selectedDate,
  dailyStartTime,
  dailyEndTime,
  onSlotChange,
}: AvailabilitySlotsManagerProps) => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const fetchAndGenerateSlots = useCallback(async () => {
    setLoadingSlots(true);
    setSlots([]);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const startOfDayUTC = startOfDay(selectedDate).toISOString();
    const endOfDayUTC = add(startOfDay(selectedDate), { days: 1, seconds: -1 }).toISOString();

    // Busca agendamentos e horários bloqueados para o dia selecionado
    const [appointmentsRes, blockedSlotsRes] = await Promise.all([
      supabase.from('appointments').select('id, appointment_time').eq('barber_id', barberId).gte('appointment_time', startOfDayUTC).lte('appointment_time', endOfDayUTC),
      supabase.from('blocked_slots').select('id, start_time').eq('barber_id', barberId).gte('start_time', startOfDayUTC).lte('start_time', endOfDayUTC),
    ]);

    const { data: appointments, error: appointmentsError } = appointmentsRes;
    const { data: blockedSlots, error: blockedSlotsError } = blockedSlotsRes;

    if (appointmentsError) {
      showError('Erro ao buscar agendamentos: ' + appointmentsError.message);
    }
    if (blockedSlotsError) {
      showError('Erro ao buscar horários bloqueados: ' + blockedSlotsError.message);
    }

    // Função auxiliar para converter timestamp UTC do DB para objeto Date local para comparação
    const toLocalTimeForComparison = (utcIsoString: string, targetDate: Date) => {
      const utcDate = new Date(utcIsoString);
      return set(startOfDay(targetDate), {
        hours: utcDate.getHours(),
        minutes: utcDate.getMinutes(),
        seconds: 0,
        milliseconds: 0
      });
    };

    const bookedTimesMap = new Map<number, string>(); // Map<timestamp, appointmentId>
    appointments?.forEach(a => {
      bookedTimesMap.set(toLocalTimeForComparison(a.appointment_time, selectedDate).getTime(), a.id);
    });

    const blockedTimesMap = new Map<number, string>(); // Map<timestamp, blockedSlotId>
    blockedSlots?.forEach(b => {
      blockedTimesMap.set(toLocalTimeForComparison(b.start_time, selectedDate).getTime(), b.id);
    });

    const generatedSlots: Slot[] = [];
    const slotDuration = 45; // Duração de cada slot em minutos
    
    let currentTime = new Date(`${dateStr}T${dailyStartTime}`);
    currentTime = set(currentTime, { milliseconds: 0 });

    const endTime = new Date(`${dateStr}T${dailyEndTime}`);
    const normalizedEndTime = set(endTime, { milliseconds: 0 });

    // Gera os slots de horário entre o início e o fim do expediente
    while (currentTime < normalizedEndTime) {
      const currentSlotTime = currentTime.getTime();
      const slot: Slot = { time: new Date(currentTime), status: 'available' };

      if (bookedTimesMap.has(currentSlotTime)) {
        slot.status = 'booked';
        slot.bookedId = bookedTimesMap.get(currentSlotTime);
      } else if (blockedTimesMap.has(currentSlotTime)) {
        slot.status = 'blocked';
        slot.blockedId = blockedTimesMap.get(currentSlotTime);
      }
      generatedSlots.push(slot);
      currentTime = add(currentTime, { minutes: slotDuration });
      currentTime = set(currentTime, { milliseconds: 0 });
    }

    setSlots(generatedSlots);
    setLoadingSlots(false);
  }, [barberId, selectedDate, dailyStartTime, dailyEndTime]);

  useEffect(() => {
    // Recarrega os slots sempre que a data, barbeiro ou horários diários mudarem
    if (barberId && selectedDate && dailyStartTime && dailyEndTime) {
      fetchAndGenerateSlots();
    } else {
      setSlots([]);
      setLoadingSlots(false);
    }
  }, [barberId, selectedDate, dailyStartTime, dailyEndTime, fetchAndGenerateSlots]);

  const handleBlockSlot = async (time: Date) => {
    const { error } = await supabase.from('blocked_slots').insert({
      barber_id: barberId,
      start_time: time.toISOString(),
      end_time: add(time, { minutes: 45 }).toISOString(),
    });
    if (error) {
      showError('Erro ao bloquear horário: ' + error.message);
    } else {
      showSuccess('Horário bloqueado.');
      fetchAndGenerateSlots(); // Atualiza a lista de slots
      onSlotChange?.(); // Notifica o pai para atualizar o calendário, se necessário
    }
  };

  const handleUnblockSlot = async (blockedId: string) => {
    const { error } = await supabase.from('blocked_slots').delete().eq('id', blockedId);
    if (error) {
      showError('Erro ao desbloquear horário: ' + error.message);
    } else {
      showSuccess('Horário desbloqueado.');
      fetchAndGenerateSlots(); // Atualiza a lista de slots
      onSlotChange?.(); // Notifica o pai para atualizar o calendário, se necessário
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-serif text-center mb-4">
        Horários para {format(selectedDate, 'dd \'de\' MMMM, yyyy', { locale: ptBR })}
      </h3>
      {loadingSlots ? (
        <div className="grid grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {slots.length > 0 ? (
            slots.map((slot, index) => (
              <Button
                key={index}
                // Estilo do botão baseado no status do slot
                variant={slot.status === 'blocked' ? 'destructive' : slot.status === 'booked' ? 'secondary' : 'outline'}
                // Ação ao clicar: bloqueia se disponível, desbloqueia se bloqueado, nada se agendado
                onClick={() => slot.status === 'available' ? handleBlockSlot(slot.time) : slot.status === 'blocked' && slot.blockedId ? handleUnblockSlot(slot.blockedId) : undefined}
                disabled={slot.status === 'booked'} // Desabilita se já estiver agendado
                className="flex items-center justify-center gap-1"
              >
                {format(slot.time, 'HH:mm')}
                {slot.status === 'blocked' && <Lock className="h-4 w-4" />}
                {slot.status === 'booked' && <CalendarCheck className="h-4 w-4" />}
              </Button>
            ))
          ) : (
            <p className="col-span-3 text-center text-muted-foreground">
              Nenhum horário disponível para gerenciamento neste dia.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AvailabilitySlotsManager;