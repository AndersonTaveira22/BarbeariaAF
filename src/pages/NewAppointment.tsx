import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import BackButton from '@/components/BackButton';

interface Service {
  id: string;
  name: string;
  price: number;
}

const NewAppointment = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchServices = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('services').select('*');
      if (error) {
        console.error('Error fetching services:', error);
      } else {
        setServices(data);
      }
      setLoading(false);
    };

    fetchServices();
  }, [currentUser, navigate]);

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    alert(`Você selecionou: ${service.name}. O próximo passo será escolher o barbeiro.`);
    // setStep(2); // Próximo passo
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-6 font-serif">Passo 1: Escolha o Serviço</h2>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full bg-card" />
                ))}
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