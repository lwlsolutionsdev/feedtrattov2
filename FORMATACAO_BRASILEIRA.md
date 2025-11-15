# 💰 FORMATAÇÃO BRASILEIRA - NÚMEROS E VALORES

## ✅ **PADRÃO IMPLEMENTADO:**

### **Formato Brasileiro:**
- ✅ Milhar: **PONTO** (.)
- ✅ Decimal: **VÍRGULA** (,)
- ✅ Moeda: R$ antes do valor

### **Formato Americano (NÃO USAR):**
- ❌ Milhar: vírgula (,)
- ❌ Decimal: ponto (.)

---

## 📋 **EXEMPLOS:**

### **Valores Monetários:**
```
✅ CORRETO (Brasil):
R$ 1.234,56
R$ 30.662,50
R$ 1.000.000,00

❌ ERRADO (EUA):
$1,234.56
R$ 30,662.50
```

### **Quantidades:**
```
✅ CORRETO (Brasil):
25.000 kg
1.500,50 kg
100.000 unidades

❌ ERRADO (EUA):
25,000 kg
1,500.50 kg
```

### **Percentuais:**
```
✅ CORRETO (Brasil):
15,5%
100,00%
0,25%

❌ ERRADO (EUA):
15.5%
100.00%
```

---

## 🔧 **IMPLEMENTAÇÃO:**

### **1. Prompt do Assistente:**

```typescript
"💰 FORMATO DE NÚMEROS (PADRÃO BRASIL): " +
"SEMPRE use formatação brasileira para números: " +
"- Valores monetários: R$ 1.234,56 (ponto para milhar, vírgula para decimal) " +
"- Quantidades: 25.000 kg (ponto para milhar) " +
"- Percentuais: 15,5% (vírgula para decimal) " +
"NUNCA use formato americano (1,234.56). SEMPRE use formato brasileiro."
```

### **2. Handlers (Backend):**

```typescript
// Formatar números no padrão brasileiro
const quantidadeFormatada = Number(quantidade).toLocaleString('pt-BR')
const valorFormatado = valor.toLocaleString('pt-BR', { 
  minimumFractionDigits: 2, 
  maximumFractionDigits: 2 
})

// Usar na mensagem
mensagem: `Valor total: R$ ${valorFormatado}`
```

### **3. Frontend (se necessário):**

```typescript
// Componente de formatação
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

// Uso
<span>{formatCurrency(30662.50)}</span> // R$ 30.662,50
<span>{formatNumber(25000)} kg</span>    // 25.000 kg
```

---

## 📊 **CASOS DE USO:**

### **Entrada de Estoque:**
```
✅ Entrada registrada com sucesso!
📊 Dados:
• Quantidade: 25.000 KG
• Valor Unitário: R$ 1,23
• Valor Total: R$ 30.662,50
```

### **Saída de Estoque:**
```
✅ Saída registrada com sucesso!
📊 Dados:
• Quantidade: 500,00 kg
• Valor Estimado: R$ 615,00
• Saldo Restante: 24.500,00 kg
```

### **Densidade de Curral:**
```
✅ Densidade calculada!
📊 Dados:
• Área: 120,00 m²
• Animais: 15
• Densidade: 8,00 m²/cabeça
```

### **Pré-Mistura:**
```
✅ Pré-mistura criada!
📊 Ingredientes:
• Milho: 60,5% (R$ 1,20/kg)
• Farelo: 39,5% (R$ 1,80/kg)
💰 Custo/kg: R$ 1,44
```

---

## 🎯 **FUNÇÃO HELPER UNIVERSAL:**

```typescript
// utils/format.ts
export const formatBR = {
  // Moeda
  currency: (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  },
  
  // Número com decimais
  number: (value: number, decimals: number = 2): string => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
  },
  
  // Número inteiro
  integer: (value: number): string => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  },
  
  // Percentual
  percent: (value: number, decimals: number = 2): string => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }) + '%'
  },
  
  // Data
  date: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('pt-BR')
  },
  
  // Data e hora
  datetime: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleString('pt-BR')
  }
}

// Uso
formatBR.currency(30662.50)      // "R$ 30.662,50"
formatBR.number(25000)           // "25.000,00"
formatBR.integer(25000)          // "25.000"
formatBR.percent(15.5)           // "15,50%"
formatBR.date('2024-11-15')      // "15/11/2024"
formatBR.datetime(new Date())    // "15/11/2024, 14:30:00"
```

---

## ⚠️ **IMPORTANTE:**

### **Consistência:**
- ✅ SEMPRE use o mesmo formato em TODO o sistema
- ✅ Backend E Frontend devem usar padrão brasileiro
- ✅ Assistente deve responder em padrão brasileiro

### **Validação:**
- ✅ Aceitar entrada do usuário em ambos os formatos
- ✅ Converter para formato brasileiro na exibição
- ✅ Armazenar no banco como número (sem formatação)

### **Testes:**
```typescript
// Testar formatação
expect(formatBR.currency(1234.56)).toBe('R$ 1.234,56')
expect(formatBR.number(1234.56)).toBe('1.234,56')
expect(formatBR.percent(15.5)).toBe('15,50%')
```

---

## 🎉 **RESULTADO:**

### **Antes:**
```
❌ Valor: R$ 30,662.50
❌ Quantidade: 25,000 kg
❌ Percentual: 15.5%
```

### **Agora:**
```
✅ Valor: R$ 30.662,50
✅ Quantidade: 25.000 kg
✅ Percentual: 15,5%
```

---

**FORMATAÇÃO BRASILEIRA 100% IMPLEMENTADA!** 🇧🇷🎉
