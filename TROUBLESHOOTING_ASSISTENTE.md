# 🔧 TROUBLESHOOTING - ASSISTENTE NÃO EXECUTA FUNÇÕES

## 🚨 **PROBLEMA:**

O assistente responde "Insumo não encontrado" SEM executar a função `registrar_entrada_estoque`.

---

## 🔍 **COMO IDENTIFICAR:**

### **Assistente ESTÁ executando (BOM ✅):**
```
Logs no terminal:
🤖 Finish reason: tool_calls
🛠️ Tool calls: 1
📥 REGISTRANDO ENTRADA: {...}
🔍 Buscando insumo: {...}
```

### **Assistente NÃO está executando (RUIM ❌):**
```
Logs no terminal:
🤖 Finish reason: stop
🛠️ Tool calls: 0
⚠️ Assistente respondeu SEM usar ferramentas!

OU

Nenhum log aparece, apenas a resposta do assistente.
```

---

## ✅ **SOLUÇÕES:**

### **Solução 1: Forçar tool_choice**

Editar `src/app/api/chat/route.ts`:

```typescript
const firstResponse = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages,
  temperature: 0,
  tools: [...],
  tool_choice: "required", // ⬅️ FORÇAR uso de ferramentas
})
```

**Problema:** Vai forçar SEMPRE, mesmo quando usuário só quer conversar.

---

### **Solução 2: Usar modelo mais confiável**

Trocar `gpt-4o-mini` por `gpt-4o`:

```typescript
const firstResponse = await openai.chat.completions.create({
  model: "gpt-4o", // ⬅️ Modelo mais confiável (mais caro)
  messages,
  temperature: 0,
  tools: [...],
  tool_choice: "auto",
})
```

**Custo:** ~10x mais caro, mas muito mais confiável.

---

### **Solução 3: Adicionar exemplo no prompt**

Adicionar ao system prompt:

```typescript
"\n\nEXEMPLO DE USO CORRETO: " +
"Usuário: 'Registre entrada de 100kg de milho' " +
"Você: [EXECUTA registrar_entrada_estoque(insumo_nome='milho', quantidade=100, ...)] " +
"Você: [AGUARDA retorno da função] " +
"Você: [RESPONDE com base no retorno] " +
"\n\nEXEMPLO ERRADO (NUNCA FAÇA ISSO): " +
"Usuário: 'Registre entrada de 100kg de milho' " +
"Você: 'Insumo não encontrado' [SEM executar função] ❌"
```

---

### **Solução 4: Validar antes de retornar**

Adicionar validação no código:

```typescript
const choice = firstResponse.choices[0]

// Se não pediu tool mas deveria ter pedido
if (choice.finish_reason === "stop" && 
    (message.toLowerCase().includes('registr') || 
     message.toLowerCase().includes('criar') ||
     message.toLowerCase().includes('adicionar'))) {
  
  console.error('❌ ERRO: Assistente deveria ter usado ferramenta!')
  
  // Forçar nova tentativa
  const retryResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      ...messages,
      {
        role: "system",
        content: "ERRO: Você DEVE usar uma ferramenta para essa operação. Tente novamente."
      }
    ],
    temperature: 0,
    tools: [...],
    tool_choice: "required", // Forçar desta vez
  })
  
  // Processar retry...
}
```

---

### **Solução 5: Few-shot examples**

Adicionar exemplos de conversas ao histórico:

```typescript
const messages = [
  { role: "system", content: "..." },
  // Exemplos de uso correto
  { role: "user", content: "Registre entrada de 100kg de milho" },
  { 
    role: "assistant", 
    content: null,
    tool_calls: [{
      id: "call_example",
      type: "function",
      function: {
        name: "registrar_entrada_estoque",
        arguments: JSON.stringify({
          insumo_nome: "milho",
          quantidade: 100,
          // ...
        })
      }
    }]
  },
  { 
    role: "tool",
    tool_call_id: "call_example",
    content: JSON.stringify({ success: true })
  },
  { 
    role: "assistant",
    content: "✅ Entrada registrada com sucesso!"
  },
  // Histórico real do usuário
  ...history,
  { role: "user", content: message },
]
```

---

## 🎯 **RECOMENDAÇÃO:**

### **Curto prazo:**
1. Usar `tool_choice: "required"` para operações de entrada/saída
2. Adicionar validação e retry

### **Médio prazo:**
1. Migrar para `gpt-4o` (mais confiável)
2. Adicionar few-shot examples

### **Longo prazo:**
1. Criar sistema de fallback
2. Implementar validação de intenção
3. Adicionar telemetria para monitorar quando falha

---

## 📊 **MONITORAMENTO:**

### **Métricas importantes:**
```typescript
// Adicionar ao código
const metrics = {
  total_requests: 0,
  tool_calls_success: 0,
  tool_calls_failed: 0,
  no_tool_when_should: 0,
}

// Após cada request
if (choice.finish_reason === "tool_calls") {
  metrics.tool_calls_success++
} else if (shouldHaveUsedTool(message)) {
  metrics.no_tool_when_should++
  console.error('❌ Assistente não usou ferramenta quando deveria!')
}

// Log periódico
console.log('📊 Métricas:', {
  taxa_sucesso: (metrics.tool_calls_success / metrics.total_requests * 100).toFixed(2) + '%',
  falhas: metrics.no_tool_when_should
})
```

---

## 🔍 **DEBUG CHECKLIST:**

Quando o assistente não executar função:

- [ ] Verificar logs: `finish_reason` e `tool_calls`
- [ ] Verificar se ferramenta está no array `tools`
- [ ] Verificar se prompt está correto
- [ ] Verificar se `tool_choice` está configurado
- [ ] Verificar temperatura (0 = mais determinístico)
- [ ] Testar com modelo `gpt-4o`
- [ ] Adicionar retry com `tool_choice: "required"`
- [ ] Verificar se mensagem do usuário é clara

---

**ÚLTIMA OPÇÃO:** Se nada funcionar, implementar parser de intenção manual e chamar funções diretamente sem depender do modelo.
