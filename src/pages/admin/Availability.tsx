import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showSuccess, showError } from '@/utils/toast';
import { Trash2 } from 'lucide-react';
import BackButton from '@/components/BackButton';

const daysOfWeek = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const Availability = () => {
  const { currentUser } = useAuth();
  const [availabilities, setAvailabilities] = useState([]);
  const [day, setDay] = useState('1');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  const fetchAvailabilities = async () => {
    if (!currentUser) return;
    const { data, error } = await supabase
      .from('barber_availability')
      .select('*')
      .eq('barber_id', currentUser.id)
      .order('day_of_week', { ascending: true });
    if (error) {
      showError('Erro ao buscar horários.');
    } else {
      setAvailabilities(data);
    }
  };

  useEffect(() => {
    fetchAvailabilities();
  }, [currentUser]);

  const handleAddAvailability = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const { error } = await supabase.from('barber_availability').upsert({
      barber_id: currentUser.id,
      day_of_week: parseInt(day),
      start_time: startTime,
      end_time: endTime,
    }, { onConflict: 'barber_id,day_of_week' });

    if (error) {
      showError('Erro ao salvar horário: ' + error.message);
    } else {
      showSuccess('Horário salvo com sucesso!');
      fetchAvailabilities();
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('barber_availability').delete().eq('id', id);
    if (error) {
      showError('Erro ao deletar horário.');
    } else {
      showSuccess('Horário removido.');
      fetchAvailabilities();
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <BackButton />
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-serif">Gerenciar Disponibilidade</CardTitle>
            <CardDescription>Adicione ou atualize seus horários de trabalho semanais.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAvailability} className="grid gap-4 mb-8 p-4 border rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Dia da Semana</Label>
                  <Select value={day} onValueChange={setDay}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="start-time">Início</Label>
                  <Input id="start-time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end-time">Fim</Label>
                  <Input id="end-time" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full sm:w-auto justify-self-end">Salvar Horário</Button>
            </form>

            <div>
              <h3 className="text-xl font-serif mb-4">Sua Agenda Semanal</h3>
              <div className="space-y-2">
                {availabilities.length > 0 ? (
                  availabilities.map(avail => (
                    <div key={avail.id} className="flex justify-between items-center p-3 bg-card rounded-md">
                      <span className="font-medium">{daysOfWeek.find(d => d.value === avail.day_of_week)?.label}</span>
                      <span>{avail.start_time.slice(0, 5)} - {avail.end_time.slice(0, 5)}</span>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(avail.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">Nenhum horário de trabalho cadastrado.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Availability;