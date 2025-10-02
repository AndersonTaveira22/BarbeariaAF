import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { showSuccess, showError } from '@/utils/toast';
import BackButton from '@/components/BackButton';
import { format, startOfDay, add } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AvailabilitySlotsManager from '@/components/admin/AvailabilitySlotsManager'; // Importa o novo componente

interface Availability {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
}

const AvailabilityPage = () => {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [hasDailyAvailability, setHasDailyAvailability] = useState(false); // Novo estado para verificar se há disponibilidade diária definida

  const fetchAvailabilities = async () => {
    if (!currentUser) return;
    const { data, error } = await supabase
      .from('barber_availability')
      .select('*')
      .eq('barber_id', currentUser.id);
    if (error) {
      showError('Erro ao buscar disponibilidades.');
    } else {
      setAvailabilities(data);
    }
  };

  useEffect(() => {
    fetchAvailabilities();
  }, [currentUser]);

  useEffect(() => {
    if (selectedDate) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const existing = availabilities.find(a => a.date === formattedDate);
      if (existing) {
        setStartTime(existing.start_time.slice(0, 5));
        setEndTime(existing.end_time.slice(0, 5));
        setHasDailyAvailability(true);
      } else {
        setStartTime('09:00');
        setEndTime('18:00');
        setHasDailyAvailability(false);
      }
    }
  }, [selectedDate, availabilities]);

  const handleSave = async () => {
    if (!currentUser || !selectedDate) return;

    const formattedDate = format(selectedDate, 'yyyy-MM-dd');

    const { error: availabilityError } = await supabase.from('barber_availability').upsert({
      barber_id: currentUser.id,
      date: formattedDate,
      start_time: startTime,
      end_time: endTime,
    }, { onConflict: 'barber_id,date' });

    if (availabilityError) {
      showError('Erro ao salvar horário: ' + availabilityError.message);
      return;
    }

    showSuccess('Disponibilidade salva com sucesso!');
    fetchAvailabilities(); // Re-busca para atualizar os destaques do calendário
  };

  const handleDelete = async () => {
    if (!currentUser || !selectedDate) return;
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const existing = availabilities.find(a => a.date === formattedDate);

    if (!existing) {
      showError('Nenhum horário para remover nesta data.');
      return;
    }

    const { error } = await supabase.from('barber_availability').delete().eq('id', existing.id);
    if (error) {
      showError('Erro ao remover horário.');
    } else {
      showSuccess('Horário removido.');
      fetchAvailabilities(); // Re-busca para atualizar os destaques do calendário
      // Também remove todos os slots bloqueados para este dia se a disponibilidade principal for removida
      await supabase.from('blocked_slots').delete().eq('barber_id', currentUser.id).gte('start_time', startOfDay(selectedDate).toISOString()).lte('start_time', add(startOfDay(selectedDate), { days: 1, seconds: -1 }).toISOString());
    }
  };

  const availableDays = availabilities.map(a => new Date(a.date + 'T00:00:00'));

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton />
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-serif">Gerenciar Disponibilidade</CardTitle>
            <CardDescription>Selecione um dia no calendário e defina seus horários de trabalho, ou bloqueie horários específicos.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex justify-center flex-col items-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => date < startOfDay(new Date())}
                modifiers={{ available: availableDays }}
                modifiersStyles={{ available: { border: "2px solid hsl(var(--primary))" } }}
                locale={ptBR}
              />
              <div className="space-y-4 mt-4 w-full max-w-[280px]"> {/* Adicionado max-w para alinhar com o calendário */}
                <h3 className="text-xl font-serif text-center mb-4">
                  {selectedDate ? format(selectedDate, 'dd \'de\' MMMM, yyyy', { locale: ptBR }) : 'Selecione uma data'}
                </h3>
                <div className="grid gap-2">
                  <Label htmlFor="start-time">Início do Expediente</Label>
                  <Input id="start-time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="grid gap-2 mt-2">
                  <Label htmlFor="end-time">Fim do Expediente</Label>
                  <Input id="end-time" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} className="flex-1">Salvar Horário Diário</Button>
                  <Button onClick={handleDelete} variant="destructive" className="flex-1" disabled={!hasDailyAvailability}>Remover Dia</Button>
                </div>
              </div>
            </div>
            {selectedDate && currentUser?.id && hasDailyAvailability ? (
              <AvailabilitySlotsManager
                barberId={currentUser.id}
                selectedDate={selectedDate}
                dailyStartTime={startTime}
                dailyEndTime={endTime}
                onSlotChange={fetchAvailabilities} // Re-busca as disponibilidades do pai para atualizar o calendário
              />
            ) : (
              <div className="flex items-center justify-center text-muted-foreground h-full">
                {selectedDate ? (
                  <p>Defina o horário diário para gerenciar os slots.</p>
                ) : (
                  <p>Selecione uma data para gerenciar a disponibilidade.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AvailabilityPage;