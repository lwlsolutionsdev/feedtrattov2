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

    const { data: preMistura, error } = await supabase
      .from('pre_misturas')
      .select(`
        *,
        ingredientes:ingredientes_pre_mistura(
          *,
          insumo:insumos(id, nome)
        )
      `)
      .eq('id', id)
      .eq('cliente_id', user.id)
      .single()

    if (error) throw error

    const ingredientes = preMistura.ingredientes || []
    const percentual_ms_total = ingredientes.reduce((sum: number, ing: any) => 
      sum + (Number(ing.percentual_mistura) * Number(ing.percentual_ms) / 100), 0
    )
    const custo_kg_total = ingredientes.reduce((sum: number, ing: any) => 
      sum + (Number(ing.percentual_mistura) * Number(ing.valor_unitario_kg) / 100), 0
    )

    return NextResponse.json({
      pre_mistura: {
        ...preMistura,
        total_ingredientes: ingredientes.length,
        percentual_ms_total,
        custo_kg: custo_kg_total,
        ingredientes: ingredientes.map((ing: any) => ({
          ...ing,
          insumo_nome: ing.insumo?.nome,
        })),
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar pré-mistura:', error)
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

    if (ingredientes && (ingredientes.length < 2 || ingredientes.length > 4)) {
      return NextResponse.json(
        { error: 'Pré-mistura deve ter entre 2 e 4 ingredientes' },
        { status: 400 }
      )
    }

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

    // Atualizar pré-mistura
    const { error: errorPM } = await supabase
      .from('pre_misturas')
      .update({ nome, descricao, ativo })
      .eq('id', id)
      .eq('cliente_id', user.id)

    if (errorPM) throw errorPM

    // Atualizar ingredientes se fornecidos
    if (ingredientes) {
      // Deletar ingredientes antigos
      await supabase
        .from('ingredientes_pre_mistura')
        .delete()
        .eq('pre_mistura_id', id)

      // Inserir novos ingredientes
      const ingredientesData = ingredientes.map((ing: any, index: number) => ({
        pre_mistura_id: id,
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
    }

    return NextResponse.json({
      message: 'Pré-mistura atualizada com sucesso!',
    })
  } catch (error: any) {
    console.error('Erro ao atualizar pré-mistura:', error)
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

    // Verificar se está sendo usada em dietas
    const { count } = await supabase
      .from('ingredientes_dieta')
      .select('*', { count: 'exact', head: true })
      .eq('pre_mistura_id', id)

    if ((count || 0) > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir pré-mistura usada em dietas. Desative-a ao invés de excluir.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('pre_misturas')
      .delete()
      .eq('id', id)
      .eq('cliente_id', user.id)

    if (error) throw error

    return NextResponse.json({
      message: 'Pré-mistura excluída com sucesso!',
    })
  } catch (error: any) {
    console.error('Erro ao excluir pré-mistura:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
