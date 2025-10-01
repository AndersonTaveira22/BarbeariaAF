import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import BackButton from '@/components/BackButton';
import { Calendar } from '@/components/ui/calendar';
import DailyAppointments from '@/components/admin/DailyAppointments';

const AdminDashboard = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <BackButton />
        <h1 className="text-4xl font-serif mb-6">Painel do Barbeiro</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <aside className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Selecionar Data</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md"
                  initialFocus
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar</CardTitle>
                <CardDescription>Configurações gerais.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to="/admin/availability">Disponibilidade</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>

          <main className="lg:col-span-2">
            <DailyAppointments selectedDate={date} />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;