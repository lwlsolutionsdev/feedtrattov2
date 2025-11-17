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
    const apenasAtivas = searchParams.get('ativas') === 'true'

    let query = supabase
      .from('dietas')
      .select(`
        *,
        ingredientes:ingredientes_dieta(
          *,
          insumo:insumos(id, nome),
          pre_mistura:pre_misturas(id, nome)
        )
      `)
      .eq('cliente_id', user.id)
      .order('nome')

    if (search) {
      query = query.ilike('nome', `%${search}%`)
    }

    if (apenasAtivas) {
      query = query.eq('ativo', true)
    }

    const { data: dietas, error } = await query

    if (error) throw error

    const dietasComCalculos = (dietas || []).map(dieta => {
      const ingredientes = dieta.ingredientes || []
      const percentual_ms_total = ingredientes.reduce((sum: number, ing: any) => 
        sum + (Number(ing.percentual_mistura) * Number(ing.percentual_ms) / 100), 0
      )
      const custo_kg_total = ingredientes.reduce((sum: number, ing: any) => 
        sum + (Number(ing.percentual_mistura) * Number(ing.valor_unitario_kg) / 100), 0
      )

      return {
        ...dieta,
        total_ingredientes: ingredientes.length,
        percentual_ms_total,
        custo_kg: custo_kg_total,
        ingredientes: ingredientes.map((ing: any) => ({
          ...ing,
          nome: ing.tipo === 'insumo' ? ing.insumo?.nome : ing.pre_mistura?.nome,
          insumo_nome: ing.insumo?.nome,
          pre_mistura_nome: ing.pre_mistura?.nome,
        })),
      }
    })

    return NextResponse.json({ dietas: dietasComCalculos })
  } catch (error: any) {
    console.error('Erro ao buscar dietas:', error)
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
    const { nome, descricao, fase_dieta, ativo, ingredientes } = body

    if (!nome) {
      return NextResponse.json(
        { error: 'Nome da dieta é obrigatório' },
        { status: 400 }
      )
    }

    if (!fase_dieta) {
      return NextResponse.json(
        { error: 'Fase da dieta é obrigatória' },
        { status: 400 }
      )
    }

    if (!ingredientes || ingredientes.length === 0) {
      return NextResponse.json(
        { error: 'Dieta deve ter pelo menos 1 ingrediente' },
        { status: 400 }
      )
    }

    const totalPercentual = ingredientes.reduce((sum: number, ing: any) => 
      sum + Number(ing.percentual_mistura), 0
    )
    if (Math.abs(totalPercentual - 100) > 0.01) {
      return NextResponse.json(
        { error: 'A soma dos percentuais deve ser 100%' },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('id', user.id)
      .single()

    // Calcular MS média e custos
    const ms_media = ingredientes.reduce((sum: number, ing: any) => 
      sum + (Number(ing.percentual_mistura) * Number(ing.percentual_ms) / 100), 0
    )
    
    const custo_mn = ingredientes.reduce((sum: number, ing: any) => 
      sum + (Number(ing.percentual_mistura) * Number(ing.valor_unitario_kg) / 100), 0
    )
    
    // Custo MS = Custo MN ÷ (MS% ÷ 100)
    const custo_ms = ms_media > 0 ? custo_mn / (ms_media / 100) : 0

    const { data: dieta, error: errorDieta } = await supabase
      .from('dietas')
      .insert({
        nome,
        descricao: descricao || null,
        fase_dieta,
        ativo: ativo !== undefined ? ativo : true,
        cliente_id: user.id,
        empresa_id: profile?.empresa_id || null,
        ms_media: Number(ms_media.toFixed(2)),
        custo_mn: Number(custo_mn.toFixed(2)),
        custo_ms: Number(custo_ms.toFixed(2)),
      })
      .select()
      .single()

    if (errorDieta) {
      if (errorDieta.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe uma dieta com este nome' },
          { status: 400 }
        )
      }
      throw errorDieta
    }

    const ingredientesData = ingredientes.map((ing: any, index: number) => ({
      dieta_id: dieta.id,
      tipo: ing.tipo,
      insumo_id: ing.tipo === 'insumo' ? ing.insumo_id : null,
      pre_mistura_id: ing.tipo === 'pre_mistura' ? ing.pre_mistura_id : null,
      percentual_mistura: Number(ing.percentual_mistura),
      percentual_ms: Number(ing.percentual_ms),
      valor_unitario_kg: Number(ing.valor_unitario_kg),
      ordem: ing.ordem || index,
    }))

    const { error: errorIng } = await supabase
      .from('ingredientes_dieta')
      .insert(ingredientesData)

    if (errorIng) throw errorIng

    return NextResponse.json({
      message: 'Dieta criada com sucesso!',
      dieta,
    })
  } catch (error: any) {
    console.error('Erro ao criar dieta:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
