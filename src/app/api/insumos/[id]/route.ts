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

    const { data: insumo, error } = await supabase
      .from('insumos')
      .select(`
        *,
        unidade_base:unidades_medida!insumos_unidade_base_id_fkey(
          id,
          nome,
          sigla
        )
      `)
      .eq('id', id)
      .eq('cliente_id', user.id)
      .single()

    if (error) throw error

    // Calcular campos derivados
    const { data: entradas } = await supabase
      .from('entradas_estoque')
      .select('quantidade_kg, valor_total')
      .eq('insumo_id', id)

    const { data: saidas } = await supabase
      .from('saidas_estoque')
      .select('quantidade')
      .eq('insumo_id', id)

    const totalEntradas = entradas?.reduce((sum, e) => sum + Number(e.quantidade_kg), 0) || 0
    const totalSaidas = saidas?.reduce((sum, s) => sum + Number(s.quantidade), 0) || 0
    const saldoAtual = totalEntradas - totalSaidas

    const somaValores = entradas?.reduce((sum, e) => sum + Number(e.valor_total), 0) || 0
    const somaKg = entradas?.reduce((sum, e) => sum + Number(e.quantidade_kg), 0) || 0
    const precoMedio = somaKg > 0 ? somaValores / somaKg : 0

    const valorImobilizado = saldoAtual * precoMedio

    let statusEstoque: 'OK' | 'BAIXO' | 'ZERADO' = 'OK'
    if (saldoAtual <= 0) {
      statusEstoque = 'ZERADO'
    } else if (saldoAtual <= Number(insumo.estoque_minimo)) {
      statusEstoque = 'BAIXO'
    }

    return NextResponse.json({
      insumo: {
        ...insumo,
        unidade_base_nome: insumo.unidade_base?.nome,
        unidade_base_sigla: insumo.unidade_base?.sigla,
        saldo_atual: saldoAtual,
        preco_medio: precoMedio,
        valor_imobilizado: valorImobilizado,
        status_estoque: statusEstoque,
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar insumo:', error)
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
    const { nome, unidade_base_id, estoque_minimo, ativo } = body

    const { data: insumo, error } = await supabase
      .from('insumos')
      .update({
        nome,
        unidade_base_id,
        estoque_minimo,
        ativo,
      })
      .eq('id', id)
      .eq('cliente_id', user.id)
      .select(`
        *,
        unidade_base:unidades_medida!insumos_unidade_base_id_fkey(
          id,
          nome,
          sigla
        )
      `)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe um insumo com este nome' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({
      message: 'Insumo atualizado com sucesso!',
      insumo,
    })
  } catch (error: any) {
    console.error('Erro ao atualizar insumo:', error)
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

    // Verificar se há entradas ou saídas vinculadas
    const { count: entradasCount } = await supabase
      .from('entradas_estoque')
      .select('*', { count: 'exact', head: true })
      .eq('insumo_id', id)

    const { count: saidasCount } = await supabase
      .from('saidas_estoque')
      .select('*', { count: 'exact', head: true })
      .eq('insumo_id', id)

    if ((entradasCount || 0) > 0 || (saidasCount || 0) > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir insumo com movimentações de estoque. Desative-o ao invés de excluir.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('insumos')
      .delete()
      .eq('id', id)
      .eq('cliente_id', user.id)

    if (error) throw error

    return NextResponse.json({
      message: 'Insumo excluído com sucesso!',
    })
  } catch (error: any) {
    console.error('Erro ao excluir insumo:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
