import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import BackButton from '@/components/BackButton';
import { showError } from '@/utils/toast';

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
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingBarbers, setLoadingBarbers] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
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
  }, [currentUser, navigate]);

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
    alert(`Você selecionou o barbeiro: ${barber.full_name}. Próximo passo: escolher data e hora.`);
    // setStep(3); // Próximo passo (a ser implementado)
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
                    className="cursor-pointer hover:border-primary transition-colors"
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
                    className="cursor-pointer hover:border-primary transition-colors"
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
        </Card>
      </div>
    </div>
  );
};

export default NewAppointment;