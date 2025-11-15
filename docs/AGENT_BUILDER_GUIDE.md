# 🤖 Guia: Configurar Agente de Currais no GPT Agent Builder

## 📋 Objetivo
Criar um agente GPT que gerencia currais através de conversação natural.

---

## 🚀 Passo 1: Criar APIs no Next.js

✅ **Já criado!** As APIs estão em:
- `src/app/api/currais/route.ts` - Listar e criar currais
- `src/app/api/currais/[id]/route.ts` - Buscar, atualizar e excluir

---

## 🎯 Passo 2: Configurar no Agent Builder

### 1. Acesse o Agent Builder
- Vá para: https://platform.openai.com/agent-builder
- Clique em **"New Workflow"**

### 2. Configure o Agente Principal

**Nome:** `Assistente de Currais`

**Instruções do Sistema:**
```
Você é um assistente especializado em gerenciar currais de confinamento de gado.

Suas responsabilidades:
- Criar currais individuais ou em lote
- Listar e buscar currais existentes
- Atualizar informações de currais
- Excluir currais quando solicitado
- Calcular densidade (m²/cabeça) quando relevante

Contexto importante:
- Área sempre em metros quadrados (m²)
- Capacidade em número de animais (cabeças)
- Linhas são letras de A-Z
- Densidade ideal: 8-12 m²/cabeça

Seja proativo e sugira melhorias quando apropriado.
```

---

## 🛠️ Passo 3: Adicionar Tools (Ferramentas)

No Agent Builder, adicione as seguintes **Function Tools**:

### Tool 1: `listar_currais`
```json
{
  "name": "listar_currais",
  "description": "Lista todos os currais do usuário. Pode filtrar por nome ou linha.",
  "parameters": {
    "type": "object",
    "properties": {
      "search": {
        "type": "string",
        "description": "Termo de busca para filtrar (opcional)"
      }
    }
  }
}
```

**URL:** `https://seu-dominio.com/api/currais`  
**Método:** `GET`

---

### Tool 2: `criar_curral_individual`
```json
{
  "name": "criar_curral_individual",
  "description": "Cria um único curral",
  "parameters": {
    "type": "object",
    "properties": {
      "tipo": {
        "type": "string",
        "enum": ["individual"],
        "description": "Tipo de criação"
      },
      "nome": {
        "type": "string",
        "description": "Nome do curral"
      },
      "linha": {
        "type": "string",
        "description": "Linha (A-Z, opcional)"
      },
      "area_m2": {
        "type": "number",
        "description": "Área em m²"
      },
      "capacidade_animais": {
        "type": "number",
        "description": "Capacidade de animais (opcional)"
      }
    },
    "required": ["tipo", "nome", "area_m2"]
  }
}
```

**URL:** `https://seu-dominio.com/api/currais`  
**Método:** `POST`

---

### Tool 3: `criar_currais_em_lote`
```json
{
  "name": "criar_currais_em_lote",
  "description": "Cria múltiplos currais de uma vez",
  "parameters": {
    "type": "object",
    "properties": {
      "tipo": {
        "type": "string",
        "enum": ["lote"],
        "description": "Tipo de criação"
      },
      "prefixo": {
        "type": "string",
        "description": "Prefixo para os nomes"
      },
      "quantidade": {
        "type": "number",
        "description": "Quantidade de currais (1-100)"
      },
      "linha": {
        "type": "string",
        "description": "Linha (A-Z, opcional)"
      },
      "area_m2": {
        "type": "number",
        "description": "Área de cada curral em m²"
      },
      "capacidade_animais": {
        "type": "number",
        "description": "Capacidade de cada curral (opcional)"
      }
    },
    "required": ["tipo", "prefixo", "quantidade", "area_m2"]
  }
}
```

**URL:** `https://seu-dominio.com/api/currais`  
**Método:** `POST`

---

### Tool 4: `atualizar_curral`
```json
{
  "name": "atualizar_curral",
  "description": "Atualiza dados de um curral",
  "parameters": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "description": "ID do curral (UUID)"
      },
      "nome": {
        "type": "string",
        "description": "Novo nome (opcional)"
      },
      "linha": {
        "type": "string",
        "description": "Nova linha (opcional)"
      },
      "area_m2": {
        "type": "number",
        "description": "Nova área (opcional)"
      },
      "capacidade_animais": {
        "type": "number",
        "description": "Nova capacidade (opcional)"
      }
    },
    "required": ["id"]
  }
}
```

**URL:** `https://seu-dominio.com/api/currais/{id}`  
**Método:** `PATCH`

---

### Tool 5: `excluir_curral`
```json
{
  "name": "excluir_curral",
  "description": "Exclui um curral permanentemente",
  "parameters": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "description": "ID do curral (UUID)"
      }
    },
    "required": ["id"]
  }
}
```

**URL:** `https://seu-dominio.com/api/currais/{id}`  
**Método:** `DELETE`

---

## 🎨 Passo 4: Workflow no Agent Builder

### Estrutura sugerida:

```
[Entrada do Usuário]
        ↓
[Agente: Analisar Intenção]
        ↓
    ┌───┴───┐
    ↓       ↓
[Criar]  [Listar]  [Editar]  [Excluir]
    ↓       ↓         ↓         ↓
[Tool]  [Tool]    [Tool]    [Tool]
    ↓       ↓         ↓         ↓
    └───┬───┘─────────┴─────────┘
        ↓
[Formatar Resposta]
        ↓
[Retornar ao Usuário]
```

---

## 💬 Exemplos de Conversação

### Exemplo 1: Criar curral individual
**Usuário:** "Crie um curral chamado 'Curral A1' com 1000m² e capacidade para 50 animais na linha A"

**Agente:** 
1. Identifica intenção: criar curral individual
2. Chama `criar_curral_individual` com parâmetros
3. Responde: "✅ Curral A1 criado com sucesso! Área: 1000m², Capacidade: 50 animais, Densidade: 20 m²/cab"

### Exemplo 2: Criar em lote
**Usuário:** "Preciso de 30 currais na linha B, cada um com 800m² e 40 animais"

**Agente:**
1. Identifica: criar em lote
2. Chama `criar_currais_em_lote`
3. Responde: "✅ 30 currais criados na linha B! Cada um com 800m² e capacidade para 40 animais (20 m²/cab)"

### Exemplo 3: Listar
**Usuário:** "Quais currais eu tenho?"

**Agente:**
1. Chama `listar_currais`
2. Formata lista
3. Responde com tabela organizada

---

## 🔐 Autenticação

As APIs usam **Supabase Auth**. Configure:

1. **Headers necessários:**
   - `Authorization: Bearer {token}`
   - `Content-Type: application/json`

2. **No Agent Builder:**
   - Configure "Authentication" → "Bearer Token"
   - Token será passado automaticamente pelo ChatKit

---

## 🚀 Deploy

### Opção 1: ChatKit (Recomendado)
```typescript
import { ChatKit } from '@openai/chatkit'

const chat = new ChatKit({
  workflowId: 'seu-workflow-id',
  apiKey: process.env.OPENAI_API_KEY
})
```

### Opção 2: SDK Customizado
Baixe o código do Agent Builder e integre no seu Next.js.

---

## ✅ Checklist Final

- [ ] APIs criadas e funcionando
- [ ] Agent Builder configurado
- [ ] Tools adicionadas
- [ ] Workflow testado no Preview
- [ ] Autenticação configurada
- [ ] Workflow publicado
- [ ] Integrado no frontend

---

## 📚 Recursos

- [Agent Builder Docs](https://platform.openai.com/docs/guides/agent-builder)
- [ChatKit Quickstart](https://platform.openai.com/docs/guides/chatkit)
- [Node Reference](https://platform.openai.com/docs/guides/node-reference)

---

**Pronto! Agora você tem um agente GPT que gerencia currais via conversação natural! 🎉**
