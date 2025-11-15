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

    let query = supabase
      .from('entradas_estoque')
      .select(`
        *,
        insumo:insumos!entradas_estoque_insumo_id_fkey(id, nome),
        unidade_entrada:unidades_medida!entradas_estoque_unidade_entrada_id_fkey(id, nome, sigla)
      `)
      .eq('cliente_id', user.id)
      .order('data_entrada', { ascending: false })

    if (search) {
      query = query.or(`insumo.nome.ilike.%${search}%`)
    }

    const { data: entradas, error } = await query

    if (error) throw error

    const entradasFormatadas = (entradas || []).map(entrada => ({
      ...entrada,
      insumo_nome: entrada.insumo?.nome,
      unidade_entrada_nome: entrada.unidade_entrada?.nome,
      unidade_entrada_sigla: entrada.unidade_entrada?.sigla,
    }))

    return NextResponse.json({ entradas: entradasFormatadas })
  } catch (error: any) {
    console.error('Erro ao buscar entradas de estoque:', error)
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
    const { insumo_id, data_entrada, unidade_entrada_id, quantidade, valor_unitario, observacoes } = body

    if (!insumo_id || !data_entrada || !unidade_entrada_id || !quantidade || !valor_unitario) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: insumo, data, unidade, quantidade e valor unitário' },
        { status: 400 }
      )
    }

    // Buscar fator de conversão da unidade
    const { data: unidade } = await supabase
      .from('unidades_medida')
      .select('fator_conversao')
      .eq('id', unidade_entrada_id)
      .single()

    if (!unidade) {
      return NextResponse.json({ error: 'Unidade de medida não encontrada' }, { status: 400 })
    }

    // Calcular quantidade em KG e valor total
    const quantidade_kg = Number(quantidade) * Number(unidade.fator_conversao)
    const valor_total = Number(quantidade) * Number(valor_unitario)

    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single()

    const { data: entrada, error } = await supabase
      .from('entradas_estoque')
      .insert({
        insumo_id,
        data_entrada,
        unidade_entrada_id,
        quantidade: Number(quantidade),
        quantidade_kg,
        valor_unitario: Number(valor_unitario),
        valor_total,
        observacoes: observacoes || null,
        cliente_id: user.id,
        empresa_id: profile?.empresa_id || null,
      })
      .select(`
        *,
        insumo:insumos!entradas_estoque_insumo_id_fkey(id, nome),
        unidade_entrada:unidades_medida!entradas_estoque_unidade_entrada_id_fkey(id, nome, sigla)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({
      message: 'Entrada de estoque registrada com sucesso!',
      entrada: {
        ...entrada,
        insumo_nome: entrada.insumo?.nome,
        unidade_entrada_nome: entrada.unidade_entrada?.nome,
        unidade_entrada_sigla: entrada.unidade_entrada?.sigla,
      },
    })
  } catch (error: any) {
    console.error('Erro ao criar entrada de estoque:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
