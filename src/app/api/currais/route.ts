import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Listar todos os currais
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    let query = supabase
      .from('currais')
      .select('*')
      .eq('cliente_id', user.id)
      .order('nome')

    if (search) {
      query = query.or(`nome.ilike.%${search}%,linha.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ currais: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Criar curral(is)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { tipo, nome, linha, area_m2, capacidade_animais, prefixo, quantidade } = body

    const { data: cliente } = await supabase
      .from('clientes')
      .select('empresa_id')
      .eq('id', user.id)
      .single()

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Criar em lote
    if (tipo === 'lote' && prefixo && quantidade) {
      const curraisData = []
      for (let i = 1; i <= parseInt(quantidade); i++) {
        curraisData.push({
          nome: `${prefixo} ${i}`,
          linha: linha || null,
          area_m2: parseFloat(area_m2),
          capacidade_animais: capacidade_animais ? parseInt(capacidade_animais) : null,
          cliente_id: user.id,
          empresa_id: cliente.empresa_id,
        })
      }

      const { data, error } = await supabase
        .from('currais')
        .insert(curraisData)
        .select()

      if (error) throw error

      return NextResponse.json({ 
        message: `${quantidade} currais criados com sucesso!`,
        currais: data 
      })
    }

    // Criar individual
    const curralData = {
      nome,
      linha: linha || null,
      area_m2: parseFloat(area_m2),
      capacidade_animais: capacidade_animais ? parseInt(capacidade_animais) : null,
      cliente_id: user.id,
      empresa_id: cliente.empresa_id,
    }

    const { data, error } = await supabase
      .from('currais')
      .insert(curralData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      message: 'Curral criado com sucesso!',
      curral: data 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
