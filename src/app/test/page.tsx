'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createClient();
        
        console.log('🔍 Testando conexão com Supabase...');
        console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
        
        const { data: empresas, error } = await supabase
          .from('empresas')
          .select('*');
        
        if (error) {
          console.error('❌ Erro:', error);
          setResult({ success: false, error: error.message });
        } else {
          console.log('✅ Sucesso! Empresas:', empresas);
          setResult({ success: true, empresas, count: empresas?.length || 0 });
        }
      } catch (error: any) {
        console.error('❌ Erro geral:', error);
        setResult({ success: false, error: error.message });
      } finally {
        setLoading(false);
      }
    }

    testConnection();
  }, []);

  if (loading) {
    return <div className="p-8">Testando conexão...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste de Conexão Supabase</h1>
      
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
        <h2 className="font-bold mb-2">Variáveis de Ambiente:</h2>
        <p className="text-sm">URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        <p className="text-sm">Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30)}...</p>
      </div>

      <div className="mt-4 bg-gray-100 dark:bg-gray-800 p-4 rounded">
        <h2 className="font-bold mb-2">Resultado:</h2>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    </div>
  );
}
