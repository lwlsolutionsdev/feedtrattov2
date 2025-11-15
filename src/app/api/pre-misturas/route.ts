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
      .from('pre_misturas')
      .select(`
        *,
        ingredientes:ingredientes_pre_mistura(
          *,
          insumo:insumos(id, nome)
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

    const { data: preMisturas, error } = await query

    if (error) throw error

    // Calcular totais
    const preMisturasComCalculos = (preMisturas || []).map(pm => {
      const ingredientes = pm.ingredientes || []
      const percentual_ms_total = ingredientes.reduce((sum: number, ing: any) => 
        sum + (Number(ing.percentual_mistura) * Number(ing.percentual_ms) / 100), 0
      )
      const custo_kg_total = ingredientes.reduce((sum: number, ing: any) => 
        sum + (Number(ing.percentual_mistura) * Number(ing.valor_unitario_kg) / 100), 0
      )

      return {
        ...pm,
        total_ingredientes: ingredientes.length,
        percentual_ms_total,
        custo_kg: custo_kg_total,
        ingredientes: ingredientes.map((ing: any) => ({
          ...ing,
          insumo_nome: ing.insumo?.nome,
        })),
      }
    })

    return NextResponse.json({ pre_misturas: preMisturasComCalculos })
  } catch (error: any) {
    console.error('Erro ao buscar pré-misturas:', error)
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
    const { nome, descricao, ativo, ingredientes } = body

    if (!nome || !ingredientes || ingredientes.length < 2 || ingredientes.length > 4) {
      return NextResponse.json(
        { error: 'Pré-mistura deve ter entre 2 e 4 ingredientes' },
        { status: 400 }
      )
    }

    // Validar total de percentuais
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

    // Criar pré-mistura
    const { data: preMistura, error: errorPM } = await supabase
      .from('pre_misturas')
      .insert({
        nome,
        descricao: descricao || null,
        ativo: ativo !== undefined ? ativo : true,
        cliente_id: user.id,
        empresa_id: profile?.empresa_id || null,
      })
      .select()
      .single()

    if (errorPM) {
      if (errorPM.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe uma pré-mistura com este nome' },
          { status: 400 }
        )
      }
      throw errorPM
    }

    // Criar ingredientes
    const ingredientesData = ingredientes.map((ing: any, index: number) => ({
      pre_mistura_id: preMistura.id,
      insumo_id: ing.insumo_id,
      percentual_mistura: Number(ing.percentual_mistura),
      percentual_ms: Number(ing.percentual_ms),
      valor_unitario_kg: Number(ing.valor_unitario_kg),
      ordem: ing.ordem || index,
    }))

    const { error: errorIng } = await supabase
      .from('ingredientes_pre_mistura')
      .insert(ingredientesData)

    if (errorIng) throw errorIng

    return NextResponse.json({
      message: 'Pré-mistura criada com sucesso!',
      preMistura,
    })
  } catch (error: any) {
    console.error('Erro ao criar pré-mistura:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
