import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User, Scissors } from 'lucide-react';

interface Appointment {
  id: string;
  appointment_time: string;
  status: string;
  client_name: string | null;
  service_name: string | null;
}

interface DailyAppointmentsProps {
  selectedDate: Date | undefined;
}

const DailyAppointments = ({ selectedDate }: DailyAppointmentsProps) => {
  const { currentUser } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!currentUser || !selectedDate) return;

      setLoading(true);

      const start = startOfDay(selectedDate).toISOString();
      const end = endOfDay(selectedDate).toISOString();

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          status,
          profiles ( full_name ),
          services ( name )
        `)
        .eq('barber_id', currentUser.id)
        .gte('appointment_time', start)
        .lte('appointment_time', end)
        .order('appointment_time', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
        setAppointments([]);
      } else {
        const formattedData = data.map(item => ({
          id: item.id,
          appointment_time: item.appointment_time,
          status: item.status,
          // The auto-generated Supabase types can be incorrect for joins, so we cast to the expected object shape.
          client_name: (item.profiles as unknown as { full_name: string })?.full_name || 'Cliente não encontrado',
          service_name: (item.services as unknown as { name: string })?.name || 'Serviço não encontrado',
        }));
        setAppointments(formattedData);
      }
      setLoading(false);
    };

    fetchAppointments();
  }, [selectedDate, currentUser]);

  const formattedDate = selectedDate ? format(selectedDate, "eeee, dd 'de' MMMM", { locale: ptBR }) : 'Nenhuma data selecionada';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agenda para {formattedDate}</CardTitle>
        <CardDescription>Seus agendamentos para o dia selecionado.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((app) => (
              <div key={app.id} className="p-4 border rounded-lg bg-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <p className="text-xl font-bold">{format(new Date(app.appointment_time), 'HH:mm')}</p>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{app.client_name}</span>
                  </div>
                   <div className="flex items-center gap-2 text-muted-foreground">
                    <Scissors className="h-4 w-4" />
                    <span>{app.service_name}</span>
                  </div>
                </div>
                <div className="capitalize px-3 py-1 text-sm rounded-full bg-secondary text-secondary-foreground">
                  {app.status}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Nenhum agendamento para esta data.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyAppointments;