import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const apenasAtivos = searchParams.get('ativos') === 'true'

    let query = supabase
      .from('vagoes')
      .select('*')
      .eq('cliente_id', user.id)
      .order('nome')

    if (search) {
      query = query.ilike('nome', `%${search}%`)
    }

    if (apenasAtivos) {
      query = query.eq('ativo', true)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ vagoes: data })
  } catch (error: any) {
    console.error('Erro ao buscar vagões:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { nome, capacidade, ativo } = body

    if (!nome || !capacidade) {
      return NextResponse.json(
        { error: 'Nome e capacidade são obrigatórios' },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single()

    const { data: vagao, error } = await supabase
      .from('vagoes')
      .insert({
        nome,
        capacidade: Number(capacidade),
        ativo: ativo !== undefined ? ativo : true,
        cliente_id: user.id,
        empresa_id: profile?.empresa_id || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe um vagão com este nome' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({
      message: 'Vagão criado com sucesso!',
      vagao,
    })
  } catch (error: any) {
    console.error('Erro ao criar vagão:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
