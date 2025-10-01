import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const BackButton = () => {
  const navigate = useNavigate();

  return (
    <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
      <ArrowLeft className="mr-2 h-4 w-4" />
      Voltar
    </Button>
  );
};

export default BackButton;