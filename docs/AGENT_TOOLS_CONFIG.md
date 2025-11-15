# 🤖 Configuração das Ferramentas no Agent Builder

## 🔗 Base URL
```
https://feedtrattov2.vercel.app
```

---

## 🛠️ Tool 1: Listar Currais

### **Nome da ferramenta:**
```
listar_currais
```

### **Descrição:**
```
Lista todos os currais do usuário. Pode filtrar por nome ou linha usando o parâmetro 'search'. Retorna informações como nome, linha, área em m², capacidade de animais e densidade (m²/cabeça).
```

### **Método HTTP:**
```
GET
```

### **URL:**
```
https://feedtrattov2.vercel.app/api/currais
```

### **Parâmetros (Query):**
```json
{
  "type": "object",
  "properties": {
    "search": {
      "type": "string",
      "description": "Termo de busca para filtrar currais por nome ou linha (opcional)"
    }
  }
}
```

### **Headers:**
```json
{
  "Content-Type": "application/json"
}
```

---

## 🛠️ Tool 2: Criar Curral Individual

### **Nome da ferramenta:**
```
criar_curral_individual
```

### **Descrição:**
```
Cria um único curral com nome, linha (opcional), área em m² e capacidade de animais (opcional). Útil quando o usuário quer criar apenas um curral específico.
```

### **Método HTTP:**
```
POST
```

### **URL:**
```
https://feedtrattov2.vercel.app/api/currais
```

### **Body (JSON):**
```json
{
  "type": "object",
  "properties": {
    "tipo": {
      "type": "string",
      "enum": ["individual"],
      "description": "Tipo de criação (sempre 'individual')"
    },
    "nome": {
      "type": "string",
      "description": "Nome do curral (ex: 'Curral A1', 'Piquete 5')"
    },
    "linha": {
      "type": "string",
      "description": "Linha do curral (A-Z, opcional)"
    },
    "area_m2": {
      "type": "number",
      "description": "Área do curral em metros quadrados"
    },
    "capacidade_animais": {
      "type": "number",
      "description": "Capacidade de animais (opcional)"
    }
  },
  "required": ["tipo", "nome", "area_m2"]
}
```

### **Headers:**
```json
{
  "Content-Type": "application/json"
}
```

---

## 🛠️ Tool 3: Criar Currais em Lote

### **Nome da ferramenta:**
```
criar_currais_lote
```

### **Descrição:**
```
Cria múltiplos currais de uma vez com o mesmo tamanho e linha. Os currais serão numerados automaticamente (ex: Curral 1, Curral 2, Curral 3...). Útil para criar vários currais padronizados rapidamente.
```

### **Método HTTP:**
```
POST
```

### **URL:**
```
https://feedtrattov2.vercel.app/api/currais
```

### **Body (JSON):**
```json
{
  "type": "object",
  "properties": {
    "tipo": {
      "type": "string",
      "enum": ["lote"],
      "description": "Tipo de criação (sempre 'lote')"
    },
    "prefixo": {
      "type": "string",
      "description": "Prefixo para os nomes dos currais (ex: 'Curral', 'Piquete')"
    },
    "quantidade": {
      "type": "number",
      "description": "Quantidade de currais a criar (1-100)",
      "minimum": 1,
      "maximum": 100
    },
    "linha": {
      "type": "string",
      "description": "Linha dos currais (A-Z, opcional)"
    },
    "area_m2": {
      "type": "number",
      "description": "Área de cada curral em metros quadrados"
    },
    "capacidade_animais": {
      "type": "number",
      "description": "Capacidade de animais de cada curral (opcional)"
    }
  },
  "required": ["tipo", "prefixo", "quantidade", "area_m2"]
}
```

### **Headers:**
```json
{
  "Content-Type": "application/json"
}
```

---

## 🛠️ Tool 4: Buscar Curral por ID

### **Nome da ferramenta:**
```
buscar_curral
```

### **Descrição:**
```
Busca um curral específico pelo ID. Retorna todos os detalhes do curral incluindo nome, linha, área, capacidade e data de criação.
```

### **Método HTTP:**
```
GET
```

### **URL:**
```
https://feedtrattov2.vercel.app/api/currais/{id}
```

### **Parâmetros (Path):**
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "ID do curral (UUID)",
      "format": "uuid"
    }
  },
  "required": ["id"]
}
```

### **Headers:**
```json
{
  "Content-Type": "application/json"
}
```

---

## 🛠️ Tool 5: Atualizar Curral

### **Nome da ferramenta:**
```
atualizar_curral
```

### **Descrição:**
```
Atualiza os dados de um curral existente. Pode atualizar nome, linha, área e/ou capacidade. Apenas os campos fornecidos serão atualizados.
```

### **Método HTTP:**
```
PATCH
```

### **URL:**
```
https://feedtrattov2.vercel.app/api/currais/{id}
```

### **Parâmetros (Path):**
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "ID do curral (UUID)",
      "format": "uuid"
    }
  },
  "required": ["id"]
}
```

### **Body (JSON):**
```json
{
  "type": "object",
  "properties": {
    "nome": {
      "type": "string",
      "description": "Novo nome do curral (opcional)"
    },
    "linha": {
      "type": "string",
      "description": "Nova linha do curral (A-Z, opcional)"
    },
    "area_m2": {
      "type": "number",
      "description": "Nova área em metros quadrados (opcional)"
    },
    "capacidade_animais": {
      "type": "number",
      "description": "Nova capacidade de animais (opcional)"
    }
  }
}
```

### **Headers:**
```json
{
  "Content-Type": "application/json"
}
```

---

## 🛠️ Tool 6: Excluir Curral

### **Nome da ferramenta:**
```
excluir_curral
```

### **Descrição:**
```
Exclui um curral permanentemente. Esta ação não pode ser desfeita. Use com cuidado e sempre confirme com o usuário antes de executar.
```

### **Método HTTP:**
```
DELETE
```

### **URL:**
```
https://feedtrattov2.vercel.app/api/currais/{id}
```

### **Parâmetros (Path):**
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "ID do curral (UUID)",
      "format": "uuid"
    }
  },
  "required": ["id"]
}
```

### **Headers:**
```json
{
  "Content-Type": "application/json"
}
```

---

## 📝 Instruções do Sistema para o Agente

Copie e cole no campo "Instructions" do Agent Builder:

```
Você é um assistente especializado em gerenciar currais de confinamento de gado.

SUAS RESPONSABILIDADES:
- Criar currais individuais ou em lote
- Listar e buscar currais existentes
- Atualizar informações de currais
- Excluir currais quando solicitado
- Calcular e informar densidade (m²/cabeça) quando relevante

CONTEXTO IMPORTANTE:
- Área sempre em metros quadrados (m²)
- Capacidade em número de animais (cabeças)
- Linhas são letras de A-Z para organização
- Densidade ideal para confinamento: 8-12 m²/cabeça
- Densidade mínima recomendada: 6 m²/cabeça
- Densidade máxima recomendada: 15 m²/cabeça

COMPORTAMENTO:
- Seja proativo e sugira melhorias quando apropriado
- Sempre calcule e informe a densidade quando criar/atualizar currais
- Alerte se a densidade estiver fora do ideal
- Confirme ações destrutivas (exclusão) antes de executar
- Forneça resumos claros após operações em lote
- Use linguagem técnica mas acessível

EXEMPLOS DE INTERAÇÃO:
- "Crie 30 currais na linha B com 800m² cada" → usar criar_currais_lote
- "Liste os currais da linha A" → usar listar_currais com search="A"
- "Aumente a capacidade do Curral 5 para 50 animais" → usar atualizar_curral
- "Qual a densidade do Curral A1?" → buscar curral e calcular área/capacidade

SEMPRE forneça feedback útil e contextual ao usuário.
```

---

## 🎯 Exemplos de Conversação

### Exemplo 1: Criar curral individual
**Usuário:** "Crie um curral chamado 'Curral A1' com 1000m² e capacidade para 50 animais na linha A"

**Agente usa:** `criar_curral_individual`
```json
{
  "tipo": "individual",
  "nome": "Curral A1",
  "linha": "A",
  "area_m2": 1000,
  "capacidade_animais": 50
}
```

**Resposta esperada:** "✅ Curral A1 criado com sucesso na linha A! Área: 1.000m², Capacidade: 50 animais, Densidade: 20 m²/cab (dentro do ideal)"

---

### Exemplo 2: Criar em lote
**Usuário:** "Preciso de 30 currais na linha B, cada um com 800m² e 40 animais"

**Agente usa:** `criar_currais_lote`
```json
{
  "tipo": "lote",
  "prefixo": "Curral",
  "quantidade": 30,
  "linha": "B",
  "area_m2": 800,
  "capacidade_animais": 40
}
```

**Resposta esperada:** "✅ 30 currais criados com sucesso na linha B! Cada um com 800m² e capacidade para 40 animais (20 m²/cab - densidade ideal)"

---

### Exemplo 3: Listar e filtrar
**Usuário:** "Quais currais eu tenho na linha A?"

**Agente usa:** `listar_currais` com `search=A`

**Resposta esperada:** Lista formatada com os currais da linha A

---

## 🔐 Autenticação

⚠️ **IMPORTANTE:** As APIs requerem autenticação via Supabase.

No Agent Builder, você precisará configurar:
- **Authentication Type:** Bearer Token
- O token será fornecido automaticamente pelo usuário logado

---

## ✅ Checklist de Configuração

- [ ] Acessar Agent Builder: https://platform.openai.com/agent-builder
- [ ] Criar novo workflow
- [ ] Adicionar as 6 ferramentas acima
- [ ] Copiar instruções do sistema
- [ ] Testar no Preview com exemplos
- [ ] Publicar workflow
- [ ] Obter workflow ID
- [ ] Integrar no frontend

---

**Pronto para configurar! Siga este guia passo a passo no Agent Builder.** 🚀
