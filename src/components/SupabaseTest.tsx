import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const SupabaseTest = () => {
  console.log("SupabaseTest: Componente SupabaseTest renderizado."); // NOVO LOG AQUI
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loadingTest, setLoadingTest] = useState(true);

  useEffect(() => {
    const runSupabaseTest = async () => {
      console.log("SupabaseTest: Iniciando teste de conexão Supabase (dentro do useEffect)...");
      setLoadingTest(true);
      try {
        console.log("SupabaseTest: Objeto Supabase (dentro do useEffect):", supabase);
        console.log("SupabaseTest: ANTES DO AWAIT - Tentando consultar a tabela 'services'...");
        const { data, error } = await supabase
          .from('services')
          .select('id, name')
          .limit(1);
        console.log("SupabaseTest: DEPOIS DO AWAIT - Consulta de 'services' concluída.");

        if (error) {
          console.error("SupabaseTest: Erro na consulta de 'services':", error);
          setTestResult(`Erro: ${error.message}`);
        } else if (data && data.length > 0) {
          console.log("SupabaseTest: Consulta de 'services' bem-sucedida:", data);
          setTestResult(`Sucesso! Serviço encontrado: ${data[0].name}`);
        } else {
          console.log("SupabaseTest: Consulta de 'services' bem-sucedida, mas sem dados.");
          setTestResult('Sucesso! Nenhuma serviço encontrado (tabela vazia ou RLS).');
        }
      } catch (e) {
        console.error("SupabaseTest: Erro inesperado durante o teste Supabase:", e);
        setTestResult(`Erro inesperado: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setLoadingTest(false);
        console.log("SupabaseTest: Teste de conexão Supabase finalizado.");
      }
    };

    runSupabaseTest();
  }, []);

  return (
    <Card className="mt-8 border-border">
      <CardHeader>
        <CardTitle className="text-xl font-serif">Teste de Conexão Supabase</CardTitle>
      </CardHeader>
      <CardContent>
        {loadingTest ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <p className="text-muted-foreground">{testResult}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default SupabaseTest;