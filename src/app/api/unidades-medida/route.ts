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
    const apenasAtivas = searchParams.get('ativas') === 'true'

    let query = supabase
      .from('unidades_medida')
      .select('*')
      .eq('cliente_id', user.id)
      .order('nome')

    if (apenasAtivas) {
      query = query.eq('ativo', true)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ unidades: data })
  } catch (error: any) {
    console.error('Erro ao buscar unidades de medida:', error)
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
    const { nome, sigla, fator_conversao, ativo } = body

    if (!nome || !sigla || !fator_conversao) {
      return NextResponse.json(
        { error: 'Nome, sigla e fator de conversão são obrigatórios' },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single()

    const { data: unidade, error } = await supabase
      .from('unidades_medida')
      .insert({
        nome,
        sigla,
        fator_conversao,
        ativo: ativo !== undefined ? ativo : true,
        cliente_id: user.id,
        empresa_id: profile?.empresa_id || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe uma unidade com este nome ou sigla' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({
      message: 'Unidade de medida criada com sucesso!',
      unidade,
    })
  } catch (error: any) {
    console.error('Erro ao criar unidade de medida:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
