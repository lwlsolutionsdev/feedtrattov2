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
    const status = searchParams.get('status')

    let query = supabase
      .from('batidas')
      .select(`
        *,
        vagao:vagoes(id, nome, capacidade),
        dieta:dietas(
          id,
          nome,
          ingredientes:ingredientes_dieta(
            *,
            insumo:insumos(id, nome),
            pre_mistura:pre_misturas(id, nome)
          )
        )
      `)
      .eq('cliente_id', user.id)
      .order('data_hora', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: batidas, error } = await query

    if (error) throw error

    const batidasFormatadas = (batidas || []).map(batida => ({
      ...batida,
      vagao_nome: batida.vagao?.nome,
      vagao_capacidade: batida.vagao?.capacidade,
      dieta_nome: batida.dieta?.nome,
      dieta_ingredientes: batida.dieta?.ingredientes?.map((ing: any) => ({
        ...ing,
        insumo_nome: ing.insumo?.nome,
        pre_mistura_nome: ing.pre_mistura?.nome,
      })),
    }))

    return NextResponse.json({ batidas: batidasFormatadas })
  } catch (error: any) {
    console.error('Erro ao buscar batidas:', error)
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
    const { vagao_id, dieta_id, quantidade, data_hora, observacoes, ingredientes_personalizados } = body

    if (!dieta_id || !quantidade || !data_hora) {
      return NextResponse.json(
        { error: 'Dieta, quantidade e data/hora são obrigatórios' },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single()

    const { data: batida, error } = await supabase
      .from('batidas')
      .insert({
        vagao_id: vagao_id || null,
        dieta_id,
        quantidade_kg: Number(quantidade),
        data_hora,
        status: 'PREPARANDO',
        observacoes: observacoes || null,
        ingredientes_personalizados: ingredientes_personalizados || null,
        cliente_id: user.id,
        empresa_id: profile?.empresa_id || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      message: 'Batida criada com sucesso!',
      batida,
    })
  } catch (error: any) {
    console.error('Erro ao criar batida:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
