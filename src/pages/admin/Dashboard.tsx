import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import BackButton from '@/components/BackButton';

const AdminDashboard = () => {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton />
        <h1 className="text-4xl font-serif mb-6">Painel do Barbeiro</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Agenda do Dia</CardTitle>
              <CardDescription>Veja seus agendamentos para hoje.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em breve: aqui você verá a lista de clientes agendados para o dia.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Disponibilidade</CardTitle>
              <CardDescription>Defina seus dias e horários de trabalho.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/admin/availability">Configurar Horários</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;