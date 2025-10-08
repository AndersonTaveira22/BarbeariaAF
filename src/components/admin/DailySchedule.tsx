import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { add, format, startOfDay, endOfDay, set } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User, Scissors, Lock, Unlock, Trash2, Phone } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Slot {
  time: Date;
  status: 'available' | 'booked' | 'blocked';
  details?: {
    id: string;
    client_name?: string;
    client_phone?: string;
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
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);

  const fetchSchedule = useCallback(async () => {
    if (!currentUser || !selectedDate) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const start = startOfDay(selectedDate).toISOString();
    const end = endOfDay(selectedDate).toISOString();

    const { data: availability, error: availabilityError } = await supabase
      .from('barber_availability')
      .select('start_time, end_time')
      .eq('barber_id', currentUser.id)
      .eq('date', dateStr)
      .single();

    if (availabilityError || !availability) {
      showError(`Disponibilidade diária não definida para ${dateStr} (Barbeiro ID: ${currentUser.id}). Por favor, defina em "Gerenciar Disponibilidade".`);
      setSlots([]);
      setLoading(false);
      return;
    }

    const [appointmentsRes, blockedSlotsRes] = await Promise.all([
      supabase.from('appointments').select('id, appointment_time, client_id, service_id, client_name, client_phone').eq('barber_id', currentUser.id).gte('appointment_time', start).lte('appointment_time', end),
      supabase.from('blocked_slots').select('id, start_time').eq('barber_id', currentUser.id).gte('start_time', start).lte('start_time', end)
    ]);

    const { data: appointments, error: appointmentsError } = appointmentsRes;
    const { data: blockedSlots, error: blockedSlotsError } = blockedSlotsRes;

    if (appointmentsError) {
      showError('Erro ao buscar agendamentos: ' + appointmentsError.message);
      setLoading(false);
      return;
    }
    if (blockedSlotsError) {
      showError('Erro ao buscar horários bloqueados: ' + blockedSlotsError.message);
    }

    const clientIds = [...new Set(appointments?.map(a => a.client_id).filter(Boolean))] as string[];
    const serviceIds = [...new Set(appointments?.map(a => a.service_id).filter(Boolean))] as string[];

    const [profilesRes, servicesRes] = await Promise.all([
      clientIds.length > 0 ? supabase.from('profiles').select('id, full_name').in('id', clientIds) : Promise.resolve({ data: [], error: null }),
      serviceIds.length > 0 ? supabase.from('services').select('id, name').in('id', serviceIds) : Promise.resolve({ data: [], error: null }),
    ]);

    const clientNamesMap = new Map<string, string>();
    profilesRes.data?.forEach(p => clientNamesMap.set(p.id, p.full_name));

    const serviceNamesMap = new Map<string, string>();
    servicesRes.data?.forEach(s => serviceNamesMap.set(s.id, s.name));

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
        client_name: clientNamesMap.get(a.client_id) || a.client_name || 'Nome Indisponível',
        client_phone: a.client_phone || 'Telefone Indisponível',
        service_name: serviceNamesMap.get(a.service_id) || 'Serviço Indisponível'
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

  const handleDeleteAppointment = async () => {
    if (!appointmentToDelete) return;

    const { error } = await supabase.from('appointments').delete().eq('id', appointmentToDelete);

    if (error) {
      showError('Erro ao cancelar agendamento: ' + error.message);
    } else {
      showSuccess('Agendamento cancelado com sucesso!');
      fetchSchedule();
      setAppointmentToDelete(null);
      setShowConfirmDelete(false);
    }
  };

  const formatPhoneNumberForWhatsApp = (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length === 11) {
      return `55${digitsOnly}`;
    } else if (digitsOnly.length === 10) {
      return `55${digitsOnly}`;
    }
    return digitsOnly;
  };

  const formattedDate = selectedDate ? format(selectedDate, "eeee, dd 'de' MMMM", { locale: ptBR }) : 'Nenhuma data selecionada';

  const renderSlotContent = (slot: Slot) => {
    switch (slot.status) {
      case 'booked':
        return (
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{slot.details?.client_name || 'Nome Indisponível'}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAppointmentToDelete(slot.details!.id);
                  setShowConfirmDelete(true);
                }}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {slot.details?.client_phone && slot.details.client_phone !== 'Telefone Indisponível' && (
              <a
                href={`https://wa.me/${formatPhoneNumberForWhatsApp(slot.details.client_phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Phone className="h-4 w-4" />
                <span>{slot.details.client_phone}</span>
              </a>
            )}
            <div className="flex items-center gap-2 text-muted-foreground"><Scissors className="h-4 w-4" /><span>{slot.details?.service_name || 'Serviço Indisponível'}</span></div>
          </div>
        );
      case 'blocked':
        return (
          <div className="flex-1 flex items-center justify-end gap-2">
            <div className="flex items-center gap-0.5 text-destructive text-xs"> {/* gap-0.5 e text-xs */}
              <Lock className="h-4 w-4" />
              <span>Bloqueado</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => handleUnblock(slot.details!.id)} className="flex-shrink-0 px-1 py-0.5 h-auto text-xs"> {/* px-1 py-0.5 e text-xs */}
              <Unlock className="h-3 w-3 mr-1" />
              Desbloquear
            </Button>
          </div>
        );
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
              <div key={slot.time.toISOString()} className="p-3 border rounded-lg bg-card flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 w-24">
                  <Clock className="h-5 w-5 text-primary" />
                  <p className="text-lg font-bold">{format(slot.time, 'HH:mm')}</p>
                </div>
                {renderSlotContent(slot)}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Nenhum agendamento ou horário bloqueado para esta data.</p>
        )}
      </CardContent>

      <AlertDialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso removerá permanentemente o agendamento do cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAppointment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default DailySchedule;