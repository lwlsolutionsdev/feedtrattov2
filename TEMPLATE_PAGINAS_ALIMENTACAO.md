# 📝 TEMPLATE PARA CRIAR AS PÁGINAS RESTANTES

## ✅ Páginas já criadas:
- ✅ `/insumos/page.tsx`
- ✅ `/unidades-medida/page.tsx`

## 📋 Páginas para criar (copie e adapte):

---

## 1️⃣ ENTRADAS DE ESTOQUE (`/entradas-estoque/page.tsx`)

### Campos da tabela:
- Data de Entrada
- Insumo
- Quantidade
- Unidade
- Valor Unitário (R$)
- Valor Total (R$)
- Ações (Excluir)

### Dialog de criar:
```tsx
- Insumo (Select)
- Data de Entrada (Input date)
- Unidade (Select)
- Quantidade (Input number)
- Valor Unitário (Input number)
- Observações (Textarea - opcional)
```

### API:
- GET `/api/entradas-estoque` ✅
- POST `/api/entradas-estoque` ✅
- DELETE `/api/entradas-estoque/[id]` ✅

---

## 2️⃣ SAÍDAS DE ESTOQUE (`/saidas-estoque/page.tsx`)

### Campos da tabela:
- Data/Hora
- Insumo
- Quantidade (kg)
- Valor Estimado (R$)
- Saldo Após (kg)
- Batida (se houver)
- Ações (Excluir - só se não vinculada a batida)

### Dialog de criar:
```tsx
- Insumo (Select)
- Data/Hora (Input datetime-local)
- Quantidade em KG (Input number)
- Observações (Textarea - opcional)
```

### API:
- GET `/api/saidas-estoque` ✅
- POST `/api/saidas-estoque` ✅
- DELETE `/api/saidas-estoque/[id]` ✅

---

## 3️⃣ PRÉ-MISTURAS (`/pre-misturas/page.tsx`)

### Campos da tabela:
- Nome
- Nº Ingredientes
- % MS Total
- Custo/kg (R$)
- Ativo
- Ações (Ver, Editar, Excluir)

### Dialog de criar/editar:
```tsx
- Nome (Input)
- Descrição (Textarea - opcional)
- Ativo (Checkbox)

INGREDIENTES (2 a 4):
Para cada ingrediente:
  - Insumo (Select)
  - % na Mistura (Input number - total deve ser 100%)
  - % MS (Input number)
  - Valor/kg (Input number)
  
Validação: Total % deve ser 100%
Barra de progresso mostrando % total
```

### API:
- GET `/api/pre-misturas` ✅
- POST `/api/pre-misturas` ✅
- GET `/api/pre-misturas/[id]` ✅
- PUT `/api/pre-misturas/[id]` ✅
- DELETE `/api/pre-misturas/[id]` ✅

---

## 4️⃣ DIETAS (`/dietas/page.tsx`)

### Campos da tabela:
- Nome
- Nº Ingredientes
- % MS Total
- Custo/kg (R$)
- Ativo
- Ações (Ver, Editar, Excluir)

### Dialog de criar/editar:
```tsx
- Nome (Input)
- Descrição (Textarea - opcional)
- Ativo (Checkbox)

INGREDIENTES (ilimitado):
Para cada ingrediente:
  - Tipo (Select: Insumo ou Pré-Mistura)
  - Insumo/Pré-Mistura (Select - depende do tipo)
  - % na Mistura (Input number - total deve ser 100%)
  - % MS (Input number)
  - Valor/kg (Input number)
  - Botão Remover

Botão: Adicionar Ingrediente
Validação: Total % deve ser 100%
Barra de progresso mostrando % total
```

### API:
- GET `/api/dietas` ✅
- POST `/api/dietas` ✅
- GET `/api/dietas/[id]` ✅
- PUT `/api/dietas/[id]` ✅
- DELETE `/api/dietas/[id]` ✅

---

## 5️⃣ BATIDAS (`/batidas/page.tsx`)

### Campos da tabela:
- Código
- Data/Hora
- Vagão
- Dieta
- Quantidade (kg)
- Status (Badge colorido)
- Ações (Aprovar, Cancelar, Excluir)

### Badges de Status:
```tsx
PREPARANDO: Badge amarelo/warning
CONCLUIDA: Badge verde/success
CANCELADA: Badge vermelho/destructive
```

### Dialog de criar:
```tsx
- Vagão (Select - opcional)
- Dieta (Select)
- Quantidade em KG (Input number)
- Data/Hora (Input datetime-local)
- Observações (Textarea - opcional)
```

### Ações especiais:
```tsx
Botão APROVAR (só se PREPARANDO):
  - Muda status para CONCLUIDA
  - Gera saídas de estoque automaticamente
  - Valida se há estoque suficiente

Botão CANCELAR (só se PREPARANDO):
  - Muda status para CANCELADA

Botão EXCLUIR (só se PREPARANDO):
  - Exclui a batida
  - Não permite se CONCLUIDA
```

### API:
- GET `/api/batidas` ✅
- POST `/api/batidas` ✅
- PUT `/api/batidas/[id]` (aprovar/cancelar) ✅
- DELETE `/api/batidas/[id]` ✅

---

## 🎨 PADRÃO DE DESIGN (use em todas):

### Layout:
```tsx
<SidebarProvider>
  <AppSidebar />
  <SidebarInset>
    <header> {/* Breadcrumb + ThemeToggle */} </header>
    
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        
        {/* Header com busca e botão */}
        <div className="flex items-center justify-between">
          <Input de busca />
          <Button laranja>Novo</Button>
        </div>

        {/* Tabela */}
        <Table />

      </div>
    </div>

    {/* Dialogs */}
  </SidebarInset>
</SidebarProvider>
```

### Botão padrão:
```tsx
<Button className="bg-orange-500 hover:bg-orange-600 text-white">
  <Plus className="h-4 w-4 mr-2" />
  Novo [Nome]
</Button>
```

### Tabela:
```tsx
- Loading: Skeleton (5 linhas)
- Empty: Component Empty com ícone
- Dados: TableRow com dados
```

### Cores de Badge:
```tsx
Ativo: variant="default" (verde)
Inativo: variant="secondary" (cinza)
Status OK: variant="default"
Status BAIXO/ZERADO: variant="destructive"
```

---

## 📊 ORDEM DE CRIAÇÃO RECOMENDADA:

1. **Entradas de Estoque** (mais simples)
2. **Saídas de Estoque** (simples)
3. **Pré-Misturas** (média - tem ingredientes)
4. **Dietas** (média - tem ingredientes + tipos)
5. **Batidas** (complexa - tem workflow de status)

---

## 🔄 COPIAR E ADAPTAR:

1. Copie `/insumos/page.tsx`
2. Renomeie variáveis e tipos
3. Ajuste campos da tabela
4. Ajuste campos do dialog
5. Ajuste chamadas de API
6. Teste!

---

## ⚠️ VALIDAÇÕES IMPORTANTES:

### Pré-Misturas e Dietas:
- Total de % deve ser 100%
- Mostrar barra de progresso
- Validar antes de salvar

### Batidas:
- Ao aprovar: validar estoque
- Mostrar erro detalhado se faltar estoque
- Não permitir excluir se CONCLUIDA

---

## 🎯 DICA:

Use o VS Code para fazer Find & Replace:
- `Insumo` → `Entrada`
- `insumo` → `entrada`
- `insumos` → `entradas`

Isso acelera muito a criação! 🚀
