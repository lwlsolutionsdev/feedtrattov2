# 🚀 Guia de Deploy no Vercel

## 📋 Pré-requisitos

- ✅ Conta no GitHub
- ✅ Conta no Vercel (vincular com GitHub)
- ✅ Projeto funcionando localmente

---

## 🔧 Passo 1: Preparar o projeto

### 1.1 Verificar variáveis de ambiente

Abra `.env.local` e confirme que tem:

```env
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
```

### 1.2 Testar build local

```bash
npm run build
```

Se der erro, corrija antes de fazer deploy!

---

## 📦 Passo 2: Subir para o GitHub

### 2.1 Inicializar Git (se ainda não fez)

```bash
git init
git add .
git commit -m "Initial commit - FeedTratto"
```

### 2.2 Criar repositório no GitHub

1. Acesse: https://github.com/new
2. Nome: `feedtratto-v2`
3. Privado ou Público (sua escolha)
4. **NÃO** adicione README, .gitignore ou license
5. Clique em **"Create repository"**

### 2.3 Conectar e enviar

```bash
git remote add origin https://github.com/SEU-USUARIO/feedtratto-v2.git
git branch -M main
git push -u origin main
```

---

## 🌐 Passo 3: Deploy no Vercel

### 3.1 Acessar Vercel

1. Acesse: https://vercel.com
2. Faça login com GitHub
3. Clique em **"Add New..."** → **"Project"**

### 3.2 Importar repositório

1. Selecione `feedtratto-v2`
2. Clique em **"Import"**

### 3.3 Configurar projeto

**Framework Preset:** Next.js (detectado automaticamente)

**Root Directory:** `./` (deixe como está)

**Build Command:** `npm run build` (padrão)

**Output Directory:** `.next` (padrão)

**Install Command:** `npm install` (padrão)

### 3.4 Configurar variáveis de ambiente

Clique em **"Environment Variables"** e adicione:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://seu-projeto.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sua-chave-anonima-aqui` |

**⚠️ IMPORTANTE:** Cole os valores do seu `.env.local`

### 3.5 Deploy!

Clique em **"Deploy"**

Aguarde 2-5 minutos... ☕

---

## ✅ Passo 4: Verificar deploy

### 4.1 Acessar URL

Vercel vai gerar uma URL tipo:
```
https://feedtratto-v2.vercel.app
```

### 4.2 Testar funcionalidades

- [ ] Login funciona?
- [ ] Sidebar aparece?
- [ ] Página de currais carrega?
- [ ] Criar curral funciona?
- [ ] APIs funcionam?

---

## 🔧 Passo 5: Configurar domínio customizado (Opcional)

### 5.1 No Vercel

1. Vá em **Settings** → **Domains**
2. Adicione seu domínio: `app.feedtratto.com`
3. Siga instruções para configurar DNS

### 5.2 Configurar subdomínio

Para `app.feedtratto.com`:

**Tipo:** CNAME  
**Nome:** app  
**Valor:** cname.vercel-dns.com

---

## 🔐 Passo 6: Configurar Supabase para produção

### 6.1 Adicionar URL do Vercel

No Supabase Dashboard:

1. **Settings** → **API**
2. **URL Configuration** → **Site URL**
3. Adicione: `https://feedtratto-v2.vercel.app`

### 6.2 Configurar redirect URLs

Em **Authentication** → **URL Configuration**:

**Redirect URLs:**
```
https://feedtratto-v2.vercel.app/auth/callback
https://feedtratto-v2.vercel.app
```

---

## 🤖 Passo 7: Configurar Agent Builder

Agora que está online, configure as ferramentas no Agent Builder:

**Base URL:** `https://feedtratto-v2.vercel.app`

**Endpoints:**
- `GET https://feedtratto-v2.vercel.app/api/currais`
- `POST https://feedtratto-v2.vercel.app/api/currais`
- `PATCH https://feedtratto-v2.vercel.app/api/currais/{id}`
- `DELETE https://feedtratto-v2.vercel.app/api/currais/{id}`

---

## 🔄 Passo 8: Deploy automático

Agora, toda vez que você fizer push no GitHub:

```bash
git add .
git commit -m "Nova feature"
git push
```

Vercel faz deploy automático! 🎉

---

## 🐛 Troubleshooting

### Erro de build?

```bash
# Limpar cache local
rm -rf .next node_modules
npm install
npm run build
```

### Erro 500 nas APIs?

- Verifique variáveis de ambiente no Vercel
- Confira logs em: Vercel Dashboard → Deployments → Logs

### Supabase não conecta?

- Confirme URL e chave no Vercel
- Verifique redirect URLs no Supabase

---

## 📊 Monitoramento

### Vercel Analytics

1. Vá em **Analytics** no dashboard
2. Veja métricas de performance

### Logs em tempo real

```bash
vercel logs
```

---

## ✅ Checklist Final

- [ ] Build local funciona
- [ ] Código no GitHub
- [ ] Deploy no Vercel concluído
- [ ] Variáveis de ambiente configuradas
- [ ] Site acessível pela URL
- [ ] Login funciona
- [ ] APIs funcionam
- [ ] Supabase configurado
- [ ] Agent Builder atualizado com nova URL

---

## 🎉 Pronto!

Seu app está no ar! 🚀

**URL de produção:** https://feedtratto-v2.vercel.app

**Próximos passos:**
1. Configurar Agent Builder com a URL de produção
2. Testar workflow do agente
3. Integrar chat na página inicial

---

## 📚 Recursos

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deploy](https://nextjs.org/docs/deployment)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
