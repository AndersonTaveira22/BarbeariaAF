import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { add, format, startOfDay, set } from 'date-fns'; // Import 'set'
import { ptBR } from 'date-fns/locale';
import { showError } from '@/utils/toast';

interface Barber {
  id: string;
  full_name: string;
  avatar_url: string;
}

interface DateTimePickerProps {
  barber: Barber;
  onDateTimeSelect: (dateTime: Date) => void;
}

const DateTimePicker = ({ barber, onDateTimeSelect }: DateTimePickerProps) => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [timeSlots, setTimeSlots] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date || !barber) return;

    const generateTimeSlots = async () => {
      setLoading(true);
      setTimeSlots([]);

      const selectedDateStr = format(date, 'yyyy-MM-dd');
      const startOfDayUTC = startOfDay(date).toISOString();
      const endOfDayUTC = add(startOfDay(date), { days: 1, seconds: -1 }).toISOString();

      const { data: availability, error: availabilityError } = await supabase
        .from('barber_availability').select('start_time, end_time').eq('barber_id', barber.id).eq('date', selectedDateStr).single();

      if (availabilityError || !availability) {
        setLoading(false);
        return;
      }

      const { data: appointments } = await supabase.from('appointments').select('appointment_time').eq('barber_id', barber.id).gte('appointment_time', startOfDayUTC).lte('appointment_time', endOfDayUTC);
      const { data: blockedSlots } = await supabase.from('blocked_slots').select('start_time').eq('barber_id', barber.id).gte('start_time', startOfDayUTC).lte('start_time', endOfDayUTC);

      // Helper to convert UTC DB timestamp to local Date object for comparison
      const toLocalTimeForComparison = (utcIsoString: string, targetDate: Date) => {
        const utcDate = new Date(utcIsoString);
        return set(startOfDay(targetDate), {
          hours: utcDate.getHours(), // Get local hour component of the UTC date
          minutes: utcDate.getMinutes(),
          seconds: 0,
          milliseconds: 0
        });
      };

      const bookedTimes = appointments?.map(a => toLocalTimeForComparison(a.appointment_time, date).getTime()) || [];
      const blockedTimes = blockedSlots?.map(s => toLocalTimeForComparison(s.start_time, date).getTime()) || [];
      
      const slots: Date[] = [];
      const slotDuration = 45;
      
      let currentTime = new Date(`${selectedDateStr}T${availability.start_time}`);
      currentTime = set(currentTime, { milliseconds: 0 }); // Normalize milliseconds
      
      const endTime = new Date(`${selectedDateStr}T${availability.end_time}`);
      const normalizedEndTime = set(endTime, { milliseconds: 0 }); // Normalize for comparison

      // Normalize current time for comparison against generated slots
      const now = set(new Date(), { seconds: 0, milliseconds: 0 });

      while (currentTime < normalizedEndTime) {
        const currentSlotTime = currentTime.getTime();
        // Para o dia de hoje, não mostra horários que já passaram
        if (currentTime.getTime() > now.getTime() && !bookedTimes.includes(currentSlotTime) && !blockedTimes.includes(currentSlotTime)) {
          slots.push(new Date(currentTime));
        }
        currentTime = add(currentTime, { minutes: slotDuration });
        currentTime = set(currentTime, { milliseconds: 0 }); // Normalize after adding minutes
      }

      setTimeSlots(slots);
      setLoading(false);
    };

    generateTimeSlots();
  }, [date, barber]);

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-center">Selecione uma data</h3>
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border"
            locale={ptBR}
            disabled={(d) => d < startOfDay(new Date())}
          />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4 text-center">Selecione um horário</h3>
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.length > 0 ? (
              timeSlots.map((slot, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => onDateTimeSelect(slot)}
                >
                  {format(slot, 'HH:mm')}
                </Button>
              ))
            ) : (
              <p className="col-span-3 text-center text-muted-foreground">
                Nenhum horário disponível para esta data.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DateTimePicker;