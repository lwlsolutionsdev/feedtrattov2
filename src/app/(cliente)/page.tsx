'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Sparkles } from 'lucide-react';

export default function AgentePage() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // TODO: Integrar com OpenAI API
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Olá! Sou o assistente do Feedtratto. Como posso ajudar você hoje?' 
      }]);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Assistente Feedtratto</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Pergunte sobre lotes, dietas, currais ou qualquer dúvida sobre confinamento
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <Sparkles className="h-12 w-12 text-muted-foreground" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Como posso ajudar?</h2>
              <p className="text-muted-foreground max-w-md">
                Faça perguntas sobre seu confinamento, crie lotes, registre dietas ou tire dúvidas sobre o sistema.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl w-full">
              <Card 
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setInput('Como criar um novo lote?')}
              >
                <p className="text-sm font-medium">Como criar um novo lote?</p>
              </Card>
              <Card 
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setInput('Mostre meus lotes ativos')}
              >
                <p className="text-sm font-medium">Mostre meus lotes ativos</p>
              </Card>
              <Card 
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setInput('Como cadastrar uma dieta?')}
              >
                <p className="text-sm font-medium">Como cadastrar uma dieta?</p>
              </Card>
              <Card 
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setInput('Qual o GMD médio dos meus lotes?')}
              >
                <p className="text-sm font-medium">Qual o GMD médio dos meus lotes?</p>
              </Card>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card className={`max-w-[80%] p-4 ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </Card>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-4 bg-muted">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite sua pergunta..."
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
