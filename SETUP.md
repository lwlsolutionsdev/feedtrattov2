# 🚀 Setup Feedtratto v2

## 📋 Passo a Passo

### 1️⃣ Rodar Migration (Criar Tabelas)

No Supabase Dashboard:
1. Vá em **SQL Editor**
2. Clique em **New Query**
3. Copie o conteúdo de `supabase/migrations/001_initial_schema.sql`
4. Cole e clique em **Run**

### 2️⃣ Rodar Seed (Criar Empresas)

No Supabase Dashboard:
1. Ainda no **SQL Editor**
2. **New Query**
3. Copie o conteúdo de `supabase/seed.sql`
4. Cole e clique em **Run**

✅ Agora você tem 2 empresas:
- **Feedtratto** (slug: `app`)
- **Nutroeste** (slug: `nutroeste`)

### 3️⃣ Criar Seu Usuário

1. No Supabase, vá em **Authentication** → **Users**
2. Clique em **Add User**
3. Preencha:
   - Email: `seu-email@exemplo.com`
   - Password: `sua-senha-segura`
   - Auto Confirm User: ✅ SIM
4. Clique em **Create User**
5. **Copie o UUID** que aparece

### 4️⃣ Vincular Você à Empresa Feedtratto

No **SQL Editor**, rode:

```sql
-- Substitua 'SEU-UUID-AQUI' pelo UUID copiado
insert into public.empresa_admins (
  id,
  empresa_id,
  email,
  nome,
  role
) values (
  'SEU-UUID-AQUI',
  (select id from public.empresas where slug = 'app'),
  'seu-email@exemplo.com',
  'Seu Nome',
  'OWNER'
);
```

### 5️⃣ Criar um Cliente de Teste

1. Crie outro usuário no **Authentication** → **Users**
2. Copie o UUID
3. No **SQL Editor**:

```sql
-- Substitua 'UUID-DO-CLIENTE' pelo UUID copiado
insert into public.clientes (
  id,
  empresa_id,
  email,
  nome,
  telefone,
  fazenda,
  ativo
) values (
  'UUID-DO-CLIENTE',
  (select id from public.empresas where slug = 'app'),
  'cliente@exemplo.com',
  'Cliente Teste',
  '(67) 99999-9999',
  'Fazenda Teste',
  true
);
```

### 6️⃣ Testar Localmente

```bash
npm run dev
```

Acesse:
- **Portal (Empresa)**: http://localhost:3000?subdomain=portal
- **Cliente (Feedtratto)**: http://localhost:3000?subdomain=app
- **Cliente (Nutroeste)**: http://localhost:3000?subdomain=nutroeste

---

## 🎯 Próximos Passos

1. ✅ Login funcionando
2. ✅ CRUD de Fazendas (com GPT Agent)
3. ✅ CRUD de Currais
4. ✅ CRUD de Dietas
5. ✅ Sistema de Lotes

---

## 🔑 Credenciais de Teste

Após criar os usuários, anote aqui:

**Empresa Admin (Portal):**
- Email: `_________________`
- Senha: `_________________`
- UUID: `_________________`

**Cliente (Feedtratto):**
- Email: `_________________`
- Senha: `_________________`
- UUID: `_________________`
