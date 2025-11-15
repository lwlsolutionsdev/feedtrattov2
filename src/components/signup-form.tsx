'use client';

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const subdomain = searchParams.get('subdomain') || 'app'

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validar senhas
    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      
      // 1. Buscar empresa pelo slug (subdomain)
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('id')
        .eq('slug', subdomain)
        .single()

      if (empresaError || !empresa) {
        throw new Error('Empresa não encontrada')
      }

      // 2. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Erro ao criar usuário')

      // 3. Criar registro na tabela clientes
      const { error: clienteError } = await supabase
        .from('clientes')
        .insert({
          id: authData.user.id,
          empresa_id: empresa.id,
          email,
          nome,
          telefone,
          ativo: true,
        })

      if (clienteError) throw clienteError

      // 4. Redirecionar para o login
      router.push('/login')
    } catch (error: any) {
      setError(error.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={handleSignup}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Criar sua conta</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Preencha o formulário abaixo para criar sua conta
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="name">Nome Completo</FieldLabel>
          <Input 
            id="name" 
            type="text" 
            placeholder="João Silva" 
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required 
            disabled={loading}
          />
        </Field>
        
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input 
            id="email" 
            type="email" 
            placeholder="seu@email.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
            disabled={loading}
          />
        </Field>
        
        <Field>
          <FieldLabel htmlFor="telefone">Telefone</FieldLabel>
          <Input 
            id="telefone" 
            type="tel" 
            placeholder="(67) 99999-9999" 
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            disabled={loading}
          />
        </Field>
        
        <Field>
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <Input 
            id="password" 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
            disabled={loading}
          />
          <FieldDescription>
            Deve ter pelo menos 8 caracteres.
          </FieldDescription>
        </Field>
        
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirmar Senha</FieldLabel>
          <Input 
            id="confirm-password" 
            type="password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required 
            disabled={loading}
          />
        </Field>
        
        <Field>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando conta...' : 'Criar Conta'}
          </Button>
        </Field>
        
        <FieldDescription className="text-center">
          Já tem uma conta? <a href="/login" className="underline">Entrar</a>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
