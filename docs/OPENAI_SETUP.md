# 🤖 Configuração da OpenAI API

## 📋 **Passo a passo:**

### **1️⃣ Criar conta na OpenAI**

1. Acesse: https://platform.openai.com/signup
2. Crie uma conta ou faça login
3. Vá em **Settings** → **Billing**
4. Adicione um método de pagamento

### **2️⃣ Criar API Key**

1. Vá em: https://platform.openai.com/api-keys
2. Clique em **"Create new secret key"**
3. Dê um nome: `feedtratto-production`
4. Copie a chave (começa com `sk-proj-...`)
5. **IMPORTANTE:** Guarde em local seguro, não será mostrada novamente!

### **3️⃣ Adicionar no Vercel**

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto: `feedtrattov2`
3. Vá em **Settings** → **Environment Variables**
4. Adicione nova variável:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** `sk-proj-...` (sua chave)
   - **Environment:** Production, Preview, Development
5. Clique em **Save**

### **4️⃣ Adicionar localmente (.env.local)**

No arquivo `.env.local` do projeto, adicione:

```env
OPENAI_API_KEY=sk-proj-sua-chave-aqui
```

**NUNCA commite este arquivo no Git!**

### **5️⃣ Redeploy no Vercel**

Após adicionar a variável:

1. Vá em **Deployments**
2. Clique nos 3 pontinhos do último deploy
3. Clique em **Redeploy**

Ou faça um novo commit e push:

```bash
git add .
git commit -m "feat: add OpenAI chat integration"
git push
```

---

## 💰 **Custos estimados:**

### **Modelo usado:** `gpt-4o-mini`

| Uso | Tokens | Custo aproximado |
|-----|--------|------------------|
| 1 mensagem simples | ~500 tokens | $0.0001 |
| 1 criação de curral | ~1000 tokens | $0.0002 |
| 100 mensagens/dia | ~50k tokens | $0.01/dia |
| 3000 mensagens/mês | ~1.5M tokens | $0.30/mês |

**Muito barato!** 🎉

---

## 🔒 **Segurança:**

### ✅ **O que está CORRETO:**

1. ✅ API Key só no backend (nunca no frontend)
2. ✅ Cada usuário autenticado via Supabase
3. ✅ Filtro por `cliente_id` em todas as queries
4. ✅ Variáveis de ambiente no Vercel
5. ✅ `.env.local` no `.gitignore`

### ❌ **NUNCA faça:**

1. ❌ Expor API Key no frontend
2. ❌ Commitar `.env.local` no Git
3. ❌ Compartilhar API Key publicamente
4. ❌ Usar mesma key em múltiplos projetos

---

## 🧪 **Testar localmente:**

```bash
# 1. Adicionar API Key no .env.local
echo "OPENAI_API_KEY=sk-proj-sua-chave" >> .env.local

# 2. Rodar projeto
npm run dev

# 3. Acessar
# http://localhost:3000/?subdomain=app

# 4. Fazer login

# 5. Testar chat:
# "Liste meus currais"
# "Crie um curral A1 com 1000m²"
```

---

## 📊 **Monitorar uso:**

1. Acesse: https://platform.openai.com/usage
2. Veja consumo em tempo real
3. Configure alertas de limite
4. Analise custos por dia/mês

---

## 🚨 **Troubleshooting:**

### **Erro: "Invalid API Key"**
- Verifique se copiou a chave completa
- Verifique se não tem espaços extras
- Crie uma nova chave se necessário

### **Erro: "Insufficient quota"**
- Adicione créditos na conta OpenAI
- Verifique billing em: https://platform.openai.com/settings/organization/billing

### **Erro: "Rate limit exceeded"**
- Aguarde alguns segundos
- Considere upgrade do plano
- Implemente rate limiting no backend

### **Chat não responde**
- Verifique se API Key está configurada
- Verifique logs do Vercel
- Teste endpoint `/api/chat` diretamente

---

## ✅ **Checklist de configuração:**

- [ ] Conta OpenAI criada
- [ ] Billing configurado
- [ ] API Key gerada
- [ ] Variável adicionada no Vercel
- [ ] `.env.local` configurado localmente
- [ ] Redeploy feito
- [ ] Chat testado e funcionando

---

## 🎯 **Próximos passos:**

Após configurar a API Key:

1. ✅ Testar chat localmente
2. ✅ Fazer deploy no Vercel
3. ✅ Testar em produção
4. ✅ Monitorar custos
5. ✅ Treinar usuários

**Tudo pronto para usar o assistente! 🚀**
