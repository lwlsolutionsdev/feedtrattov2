import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: dieta, error } = await supabase
      .from('dietas')
      .select(`
        *,
        ingredientes:ingredientes_dieta(
          *,
          insumo:insumos(id, nome),
          pre_mistura:pre_misturas(id, nome)
        )
      `)
      .eq('id', id)
      .eq('cliente_id', user.id)
      .single()

    if (error) throw error

    const ingredientes = dieta.ingredientes || []
    const percentual_ms_total = ingredientes.reduce((sum: number, ing: any) => 
      sum + (Number(ing.percentual_mistura) * Number(ing.percentual_ms) / 100), 0
    )
    const custo_kg_total = ingredientes.reduce((sum: number, ing: any) => 
      sum + (Number(ing.percentual_mistura) * Number(ing.valor_unitario_kg) / 100), 0
    )

    return NextResponse.json({
      dieta: {
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
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar dieta:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { nome, descricao, ativo, ingredientes } = body

    if (ingredientes) {
      const totalPercentual = ingredientes.reduce((sum: number, ing: any) => 
        sum + Number(ing.percentual_mistura), 0
      )
      if (Math.abs(totalPercentual - 100) > 0.01) {
        return NextResponse.json(
          { error: 'A soma dos percentuais deve ser 100%' },
          { status: 400 }
        )
      }
    }

    // Calcular MS média e custos se ingredientes foram fornecidos
    let updateData: any = { nome, descricao, ativo }
    
    if (ingredientes) {
      const ms_media = ingredientes.reduce((sum: number, ing: any) => 
        sum + (Number(ing.percentual_mistura) * Number(ing.percentual_ms) / 100), 0
      )
      
      const custo_mn = ingredientes.reduce((sum: number, ing: any) => 
        sum + (Number(ing.percentual_mistura) * Number(ing.valor_unitario_kg) / 100), 0
      )
      
      // Custo MS = Custo MN ÷ (MS% ÷ 100)
      const custo_ms = ms_media > 0 ? custo_mn / (ms_media / 100) : 0
      
      updateData.ms_media = Number(ms_media.toFixed(2))
      updateData.custo_mn = Number(custo_mn.toFixed(2))
      updateData.custo_ms = Number(custo_ms.toFixed(2))
    }

    const { error: errorDieta } = await supabase
      .from('dietas')
      .update(updateData)
      .eq('id', id)
      .eq('cliente_id', user.id)

    if (errorDieta) throw errorDieta

    if (ingredientes) {
      await supabase
        .from('ingredientes_dieta')
        .delete()
        .eq('dieta_id', id)

      const ingredientesData = ingredientes.map((ing: any, index: number) => ({
        dieta_id: id,
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
    }

    return NextResponse.json({
      message: 'Dieta atualizada com sucesso!',
    })
  } catch (error: any) {
    console.error('Erro ao atualizar dieta:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { count } = await supabase
      .from('batidas')
      .select('*', { count: 'exact', head: true })
      .eq('dieta_id', id)

    if ((count || 0) > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir dieta usada em batidas. Desative-a ao invés de excluir.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('dietas')
      .delete()
      .eq('id', id)
      .eq('cliente_id', user.id)

    if (error) throw error

    return NextResponse.json({
      message: 'Dieta excluída com sucesso!',
    })
  } catch (error: any) {
    console.error('Erro ao excluir dieta:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
