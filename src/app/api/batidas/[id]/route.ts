import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
    const { status } = body

    // Buscar batida
    const { data: batida } = await supabase
      .from('batidas')
      .select(`
        *,
        dieta:dietas(
          ingredientes:ingredientes_dieta(
            tipo,
            insumo_id,
            pre_mistura_id,
            percentual_mistura
          )
        )
      `)
      .eq('id', id)
      .eq('cliente_id', user.id)
      .single()

    if (!batida) {
      return NextResponse.json({ error: 'Batida não encontrada' }, { status: 404 })
    }

    // Se está aprovando (CONCLUIDA), gerar saídas de estoque
    if (status === 'CONCLUIDA' && batida.status === 'PREPARANDO') {
      const ingredientes = batida.ingredientes_personalizados || 
        batida.dieta?.ingredientes?.map((ing: any) => ({
          insumo_id: ing.insumo_id,
          quantidade_kg: (Number(batida.quantidade_kg) * Number(ing.percentual_mistura)) / 100
        }))

      if (!ingredientes || ingredientes.length === 0) {
        return NextResponse.json(
          { error: 'Não foi possível calcular ingredientes da batida' },
          { status: 400 }
        )
      }

      // Verificar estoque de cada ingrediente
      for (const ing of ingredientes) {
        if (!ing.insumo_id) continue

        const { data: entradas } = await supabase
          .from('entradas_estoque')
          .select('quantidade_kg')
          .eq('insumo_id', ing.insumo_id)

        const { data: saidas } = await supabase
          .from('saidas_estoque')
          .select('quantidade')
          .eq('insumo_id', ing.insumo_id)

        const totalEntradas = entradas?.reduce((sum, e) => sum + Number(e.quantidade_kg), 0) || 0
        const totalSaidas = saidas?.reduce((sum, s) => sum + Number(s.quantidade), 0) || 0
        const saldoAtual = totalEntradas - totalSaidas

        if (saldoAtual < ing.quantidade_kg) {
          const { data: insumo } = await supabase
            .from('insumos')
            .select('nome')
            .eq('id', ing.insumo_id)
            .single()

          return NextResponse.json(
            { 
              error: `Estoque insuficiente de ${insumo?.nome || 'insumo'}. Disponível: ${saldoAtual.toFixed(2)} kg, Necessário: ${ing.quantidade_kg.toFixed(2)} kg` 
            },
            { status: 400 }
          )
        }
      }

      // Criar saídas de estoque
      for (const ing of ingredientes) {
        if (!ing.insumo_id) continue

        const { data: entradas } = await supabase
          .from('entradas_estoque')
          .select('quantidade_kg, valor_total')
          .eq('insumo_id', ing.insumo_id)

        const { data: saidas } = await supabase
          .from('saidas_estoque')
          .select('quantidade')
          .eq('insumo_id', ing.insumo_id)

        const totalEntradas = entradas?.reduce((sum, e) => sum + Number(e.quantidade_kg), 0) || 0
        const totalSaidas = saidas?.reduce((sum, s) => sum + Number(s.quantidade), 0) || 0
        const saldoAtual = totalEntradas - totalSaidas

        const somaValores = entradas?.reduce((sum, e) => sum + Number(e.valor_total), 0) || 0
        const somaKg = entradas?.reduce((sum, e) => sum + Number(e.quantidade_kg), 0) || 0
        const precoMedio = somaKg > 0 ? somaValores / somaKg : 0
        const valor_estimado = ing.quantidade_kg * precoMedio
        const saldo_apos_saida = saldoAtual - ing.quantidade_kg

        await supabase
          .from('saidas_estoque')
          .insert({
            insumo_id: ing.insumo_id,
            batida_id: id,
            data_hora: batida.data_hora,
            quantidade: ing.quantidade_kg,
            valor_estimado,
            saldo_apos_saida,
            observacoes: `Saída automática - Batida ${batida.codigo}`,
            cliente_id: user.id,
            empresa_id: batida.empresa_id,
          })
      }
    }

    // Atualizar status da batida
    const { error } = await supabase
      .from('batidas')
      .update({ status })
      .eq('id', id)
      .eq('cliente_id', user.id)

    if (error) throw error

    return NextResponse.json({
      message: status === 'CONCLUIDA' 
        ? 'Batida aprovada e saídas de estoque geradas com sucesso!' 
        : 'Batida atualizada com sucesso!',
    })
  } catch (error: any) {
    console.error('Erro ao atualizar batida:', error)
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

    // Verificar se pode excluir
    const { data: batida } = await supabase
      .from('batidas')
      .select('status')
      .eq('id', id)
      .eq('cliente_id', user.id)
      .single()

    if (batida?.status === 'CONCLUIDA') {
      return NextResponse.json(
        { error: 'Não é possível excluir batida concluída. Cancele-a ao invés de excluir.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('batidas')
      .delete()
      .eq('id', id)
      .eq('cliente_id', user.id)

    if (error) throw error

    return NextResponse.json({
      message: 'Batida excluída com sucesso!',
    })
  } catch (error: any) {
    console.error('Erro ao excluir batida:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
