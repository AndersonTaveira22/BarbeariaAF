import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import BackButton from '@/components/BackButton';
import { showError, showSuccess } from '@/utils/toast';
import DateTimePicker from '@/components/DateTimePicker';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Service {
  id: string;
  name: string;
  price: number;
}

interface Barber {
  id: string;
  full_name: string;
  avatar_url: string;
}

const NewAppointment = () => {
  const { currentUser, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [appointmentTime, setAppointmentTime] = useState<Date | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingBarbers, setLoadingBarbers] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Preenche o nome do cliente automaticamente se o perfil estiver disponível
    if (profile?.full_name) {
      setClientName(profile.full_name);
    }

    const fetchServices = async () => {
      setLoadingServices(true);
      const { data, error } = await supabase.from('services').select('*');
      if (error) {
        showError('Erro ao buscar serviços.');
      } else {
        setServices(data);
      }
      setLoadingServices(false);
    };

    fetchServices();
  }, [currentUser, navigate, profile]);

  useEffect(() => {
    const fetchBarbers = async () => {
      setLoadingBarbers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('role', 'admin');
      
      if (error) {
          showError('Erro ao buscar barbeiros.');
      } else {
          setBarbers(data);
      }
      setLoadingBarbers(false);
    };

    if (step === 2) {
      fetchBarbers();
    }
  }, [step]);

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleSelectBarber = (barber: Barber) => {
    setSelectedBarber(barber);
    setStep(3);
  };

  const handleDateTimeSelect = (dateTime: Date) => {
    setAppointmentTime(dateTime);
    setStep(4); // Move to step 4 to collect client info
  };

  const handleClientInfoSubmit = () => {
    if (!clientName || !clientPhone) {
      showError("Por favor, preencha seu nome e telefone.");
      return;
    }
    setStep(5); // Move to confirmation step
  };

  const handleConfirmBooking = async () => {
    if (!currentUser || !selectedService || !selectedBarber || !appointmentTime || !clientName || !clientPhone) {
      showError("Informações incompletas para o agendamento.");
      return;
    }
    setIsBooking(true);
    const { error } = await supabase.from('appointments').insert({
      client_id: currentUser.id,
      barber_id: selectedBarber.id,
      service_id: selectedService.id,
      appointment_time: appointmentTime.toISOString(),
      status: 'agendado',
      client_name: clientName, // Save client name
      client_phone: clientPhone, // Save client phone
    });

    if (error) {
      showError(`Erro ao agendar: ${error.message}`);
    } else {
      showSuccess('Agendamento realizado com sucesso!');
      navigate('/');
    }
    setIsBooking(false);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-6 font-serif">Passo 1: Escolha o Serviço</h2>
            {loadingServices ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full bg-card" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((service) => (
                  <Card
                    key={service.id}
                    className="cursor-pointer hover:border-primary transition-all duration-300 ease-in-out hover:-translate-y-1"
                    onClick={() => handleSelectService(service)}
                  >
                    <CardContent className="p-6 flex justify-between items-center">
                      <h3 className="text-lg font-medium font-sans">{service.name}</h3>
                      <p className="text-lg font-semibold text-primary">
                        R$ {service.price.toFixed(2).replace('.', ',')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      case 2:
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-6 font-serif">Passo 2: Escolha o Barbeiro</h2>
            {loadingBarbers ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full bg-card" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {barbers.map((barber) => (
                  <Card
                    key={barber.id}
                    className="cursor-pointer hover:border-primary transition-all duration-300 ease-in-out hover:-translate-y-1"
                    onClick={() => handleSelectBarber(barber)}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={barber.avatar_url} alt={barber.full_name} />
                        <AvatarFallback>{barber.full_name?.charAt(0) || 'B'}</AvatarFallback>
                      </Avatar>
                      <h3 className="text-lg font-medium font-sans">{barber.full_name}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-6 font-serif">Passo 3: Escolha a Data e Hora</h2>
            <DateTimePicker barber={selectedBarber!} onDateTimeSelect={handleDateTimeSelect} />
          </div>
        );
      case 4:
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-6 font-serif">Passo 4: Seus Dados</h2>
            <div className="space-y-4 p-4 border rounded-lg bg-card">
              <div className="grid gap-2">
                <Label htmlFor="client-name">Seu Nome Completo</Label>
                <Input
                  id="client-name"
                  type="text"
                  placeholder="Seu Nome"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client-phone">Seu Telefone</Label>
                <Input
                  id="client-phone"
                  type="tel"
                  placeholder="(XX) XXXXX-XXXX"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>
              <Button onClick={handleClientInfoSubmit} className="w-full">
                Continuar
              </Button>
            </div>
          </div>
        );
      case 5:
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-6 font-serif">Passo 5: Confirme seu Agendamento</h2>
            <div className="space-y-4 p-4 border rounded-lg bg-card">
              <p><strong>Serviço:</strong> {selectedService?.name}</p>
              <p><strong>Barbeiro:</strong> {selectedBarber?.full_name}</p>
              <p><strong>Data e Hora:</strong> {appointmentTime ? format(appointmentTime, "eeee, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }) : ''}</p>
              <p><strong>Seu Nome:</strong> {clientName}</p>
              <p><strong>Seu Telefone:</strong> {clientPhone}</p>
              <p className="text-lg font-bold"><strong>Total:</strong> R$ {selectedService?.price.toFixed(2).replace('.', ',')}</p>
            </div>
          </div>
        );
      default:
        return <div>Carregando...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton />
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-4xl font-serif">Novo Agendamento</CardTitle>
            <CardDescription>Siga os passos para agendar seu horário.</CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
          {step === 5 && (
            <CardFooter>
              <Button onClick={handleConfirmBooking} disabled={isBooking} className="w-full">
                {isBooking ? 'Agendando...' : 'Confirmar Agendamento'}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default NewAppointment;